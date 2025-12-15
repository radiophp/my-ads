#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

# Optional .env-style config file (same as bash worker)
$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { Join-Path $PSScriptRoot 'fetch_divar_phones_worker.env' }
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    if ($_ -match '^\s*([^=]+)=(.*)$') {
      $k = $Matches[1].Trim()
      $v = $Matches[2]
      $env:$k = $v
    }
  }
}

# Config (can be overridden via env)
$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { 'https://mahan.toncloud.observer/api' }
$HeadersFile = if ($env:HEADERS_FILE) { $env:HEADERS_FILE } else { Join-Path $PSScriptRoot 'jwt.txt' }
$SleepSec = if ($env:SLEEP) { [int]$env:SLEEP } else { 10 }
$WorkerId = if ($env:WORKER_ID) { $env:WORKER_ID } else { "psworker-$PID" }
$Token = $env:TOKEN

Write-Host "[$WorkerId] Using BASE_URL=$BaseUrl"

if (-not (Test-Path $HeadersFile)) { throw "Headers file not found: $HeadersFile" }

# Load headers from jwt.txt, skip Content-Length
$headerLines = Get-Content $HeadersFile | Where-Object { $_ -match '^[A-Za-z0-9_-]+:' }
$headers = @{}
foreach ($line in $headerLines) {
  $name, $val = $line -split ":\s*", 2
  if ($name -ieq 'Content-Length') { continue }
  $headers[$name] = $val
}
if ($Token) { $headers['Authorization'] = "Bearer $Token" }

function Ensure-Playwright {
  try {
    Write-Host "[$WorkerId] [Playwright] Checking Playwright..."
    & npx -y playwright@latest --version | Out-Null
    Write-Host "[$WorkerId] [Playwright] Playwright OK."
    return
  } catch {
    Write-Host "[$WorkerId] [Playwright] Playwright missing; installing..."
  }
  try {
    & npx -y playwright@latest install | Out-Null
    Write-Host "[$WorkerId] [Playwright] Playwright installed."
  } catch {
    Write-Warning "[$WorkerId] [Playwright] Install failed: $($_.Exception.Message)"
  }
}

function Normalize-Phone($p) {
  if (-not $p) { return $null }
  $map = @{ '۰'='0';'۱'='1';'۲'='2';'۳'='3';'۴'='4';'۵'='5';'۶'='6';'۷'='7';'۸'='8';'۹'='9' }
  $chars = $p.ToCharArray() | ForEach-Object {
    if ($map.ContainsKey($_)) { $map[$_] }
    elseif ($_ -match '[0-9]') { $_ }
  }
  return ($chars -join '')
}

Ensure-Playwright

while ($true) {
  # Lease
  try {
    Write-Host "[$WorkerId] Lease -> $BaseUrl/phone-fetch/lease"
    $leaseResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/phone-fetch/lease" `
      -Headers @{ 'Content-Type'='application/json' } `
      -Body (@{ workerId = $WorkerId } | ConvertTo-Json -Compress) `
      -ErrorAction Stop
  } catch {
    Write-Warning "[$WorkerId] Lease request failed: $($_.Exception.Message)"
    Start-Sleep -Seconds $SleepSec
    continue
  }

  if ($leaseResp.status -eq 'empty') { Start-Sleep -Seconds $SleepSec; continue }
  if (-not $leaseResp.leaseId) {
    Write-Warning "[$WorkerId] Lease missing fields: $($leaseResp | ConvertTo-Json -Compress)"
    Start-Sleep -Seconds $SleepSec
    continue
  }

  $leaseId = $leaseResp.leaseId
  $externalId = $leaseResp.externalId
  $contactUuid = $leaseResp.contactUuid
  $businessRef = $leaseResp.businessRef
  $needsTitle  = [bool]$leaseResp.needsBusinessTitle
  $postTitle   = $leaseResp.postTitle

  Write-Host "[$WorkerId] Fetching phone for $externalId (lease $leaseId) -> https://divar.ir/v/$externalId $(if($businessRef){"[business=$businessRef needsTitle=$needsTitle]"} else {'[personal]'}) `"$postTitle`""

  # Preflight
  Invoke-RestMethod -Method Get -Uri "https://api.divar.ir/v8/posts/$externalId" `
    -Headers $headers -ErrorAction SilentlyContinue | Out-Null
  Start-Sleep -Seconds 2

  # Contact fetch
  $contactResp = Invoke-WebRequest -Method Post -Uri "https://api.divar.ir/v8/postcontact/web/contact_info_v2/$externalId" `
    -Headers $headers `
    -Body (@{ contact_uuid = $contactUuid } | ConvertTo-Json -Compress) `
    -ErrorAction SilentlyContinue

  $contactCode = [int]$contactResp.StatusCode
  $contactBody = $contactResp.Content
  $contactBodySnip = if ($contactBody) { $contactBody.Substring(0, [Math]::Min(300, $contactBody.Length)) } else { "" }
  $phoneRaw = $null
  try {
    $json = $contactBody | ConvertFrom-Json -ErrorAction Stop
    $phoneRaw = $json.widget_list |
      ForEach-Object { $_.data.action.payload.phone_number } |
      Where-Object { $_ } | Select-Object -First 1
  } catch {}

  $status = 'ok'
  $err = $null
  $phoneNorm = $null

  if ($contactCode -ne 200 -or -not $phoneRaw) {
    $status = 'error'
    $err = "http=$contactCode"
    if (-not $phoneRaw -and $contactCode -eq 200) { $err = "http=$contactCode phone_missing" }
    Write-Warning "[$WorkerId] Failed for $externalId ($err) body=""$contactBodySnip"""
  } else {
    $phoneNorm = Normalize-Phone $phoneRaw
    Write-Host "[$WorkerId] Saved $externalId -> $phoneNorm"
  }

  # Business title (optional)
  $businessTitle = $null
  if ($needsTitle -and $businessRef) {
    $brandToken = ($businessRef -split '_')[-1]
    $titleUrl = "https://api.divar.ir/v8/premium-user/web/business/brand-landing/$brandToken"
    Write-Host "[$WorkerId] Fetching business title via POST $titleUrl payload={brand_token:$brandToken}"
    $titleBodyObj = @{
      specification = @{ last_item_identifier = "" }
      request_data  = @{ brand_token = $brandToken; tracker_session_id = "" }
    }
    $titleHeaders = $headers.Clone()
    $titleHeaders['Content-Type'] = 'application/json'
    $titleResp = Invoke-WebRequest -Method Post -Uri $titleUrl `
      -Headers $titleHeaders `
      -Body ($titleBodyObj | ConvertTo-Json -Compress) `
      -ErrorAction SilentlyContinue
    $titleCode = [int]$titleResp.StatusCode
    $titleContent = $titleResp.Content
    try {
      $titleJson = $titleContent | ConvertFrom-Json -ErrorAction Stop
      $businessTitle = $titleJson.header_widget_list |
        Where-Object { $_.widget_type -eq 'LEGEND_TITLE_ROW' } |
        Select-Object -ExpandProperty data -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty title -ErrorAction SilentlyContinue
    } catch {}
    if ($businessTitle) {
      Write-Host "[$WorkerId] Business title fetched for $businessRef -> ""$businessTitle"""
    } else {
      $snip = if ($titleContent) { $titleContent.Substring(0, [Math]::Min(300, $titleContent.Length)) } else { "" }
      Write-Warning "[$WorkerId] Business title not found (http $titleCode) for $businessRef body=""$snip"""
    }
  }

  # Report
  $report = @{
    leaseId = $leaseId
    status  = $status
  }
  if ($status -eq 'ok') {
    $report.phoneNumber = $phoneNorm
    if ($businessTitle) { $report.businessTitle = $businessTitle }
  } else {
    $report.error = $err
  }

  Invoke-RestMethod -Method Post -Uri "$BaseUrl/phone-fetch/report" `
    -Headers @{ 'Content-Type'='application/json' } `
    -Body ($report | ConvertTo-Json -Compress) `
    -ErrorAction SilentlyContinue | Out-Null

  Start-Sleep -Seconds $SleepSec
}
