#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

# Optional .env-style config file (same as bash worker)
$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { Join-Path $PSScriptRoot 'fetch_divar_phones_worker.env' }
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^[#\s]' -or $_ -match '^\s*$') { return }
    if ($_ -match '^(?<k>[^=]+)=(?<v>.*)$') {
      Set-Item -Path Env:$($Matches['k'].Trim()) -Value $Matches['v'] -Force
    }
  }
}

# Config (can be overridden via env)
$BaseUrl    = if ($env:BASE_URL)    { $env:BASE_URL }    else { 'https://mahan.toncloud.observer/api' }
$HeadersFile= if ($env:HEADERS_FILE) { $env:HEADERS_FILE } else { Join-Path $PSScriptRoot 'jwt.txt' }
$SleepSec   = if ($env:SLEEP)       { [int]$env:SLEEP }  else { 10 }
$WorkerId   = if ($env:WORKER_ID)   { $env:WORKER_ID }   else { "psworker-$PID" }
$Token      = $env:TOKEN
$FetchMethod= $env:FETCH_METHOD

Write-Host "[$WorkerId] Using BASE_URL=$BaseUrl"

if (-not (Test-Path $HeadersFile)) { throw "Headers file not found: $HeadersFile" }

# Load headers from jwt.txt, skip Content-Length/Connection
$headerLines = Get-Content $HeadersFile | Where-Object { $_ -match '^[A-Za-z0-9_-]+:' }
$headers = @{}
foreach ($line in $headerLines) {
  $name, $val = $line -split "\s*:\s*", 2
  if ($name -ieq 'Content-Length' -or $name -ieq 'Connection') { continue }
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

if (-not $FetchMethod) {
  $FetchMethod = Read-Host "Fetch method [playwright/curl] (default playwright)"
  if (-not $FetchMethod) { $FetchMethod = 'playwright' }
}
$FetchMethod = $FetchMethod.ToLower()
Write-Host "[$WorkerId] Using method=$FetchMethod"

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

  Write-Host "[$WorkerId] Fetching phone for $externalId (lease $leaseId) -> https://divar.ir/v/$externalId $(if($businessRef){"[business=$businessRef needsTitle=$needsTitle]"} else {'[personal]'}) \"$postTitle\""

  # Preflight
  try {
    $preHeaders = $headers.Clone()
    $preHeaders['Accept-Encoding'] = 'identity'
    Invoke-WebRequest -Method Get -Uri "https://api.divar.ir/v8/posts/$externalId" `
      -Headers $preHeaders -ErrorAction SilentlyContinue | Out-Null
  } catch {}
  Start-Sleep -Seconds 2

  $contactCode = 0
  $contactBodySnip = ""
  $phoneRaw = $null
  $status = $null
  $err = $null

  if ($FetchMethod -eq 'playwright') {
    $env:EXTERNAL_ID = $externalId
    $pwOutput = node -e @"
const { chromium } = require('playwright');
const id = process.env.EXTERNAL_ID;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('https://divar.ir/v/' + id, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const btn = page.getByText('اطلاعات تماس');
  await btn.click({ timeout: 10000 });
  const number = await page.waitForFunction(() => {
    const m = document.body.innerText.match(/09\d{9}/);
    return m ? m[0] : null;
  }, { timeout: 10000 });
  console.log(number);
  await browser.close();
})().catch(err => {
  console.error(err.message || String(err));
  process.exit(1);
});
"@ 2>&1
    $rc = $LASTEXITCODE
    $pwOutput = $pwOutput.Trim()
    if ($rc -ne 0 -or -not $pwOutput) {
      Write-Warning "[$WorkerId] Playwright failed for $externalId (rc=$rc) output=\"$pwOutput\""
      $status = 'error'
      $err = "playwright_failed"
    } else {
      $phoneRaw = $pwOutput
      $contactCode = 200
    }
  } else {
    # Contact fetch via API
    $contactHeaders = $headers.Clone()
    $contactHeaders['Accept-Encoding'] = 'identity'
    $contactResp = Invoke-WebRequest -Method Post -Uri "https://api.divar.ir/v8/postcontact/web/contact_info_v2/$externalId" `
      -Headers $contactHeaders `
      -Body (@{ contact_uuid = $contactUuid } | ConvertTo-Json -Compress) `
      -ErrorAction SilentlyContinue

    $contactCode = [int]$contactResp.StatusCode
    $contactBody = $contactResp.Content
    $contactBodySnip = if ($contactBody) { $contactBody.Substring(0, [Math]::Min(300, $contactBody.Length)) } else { "" }
    try {
      $json = $contactBody | ConvertFrom-Json -ErrorAction Stop
      $phoneRaw = $json.widget_list |
        ForEach-Object { $_.data.action.payload.phone_number } |
        Where-Object { $_ } | Select-Object -First 1
    } catch {}
  }

  if ($contactCode -ne 200 -or -not $phoneRaw) {
    if (-not $status) { $status = 'error' }
    if (-not $err) {
      $err = "http=$contactCode"
      if (-not $phoneRaw -and $contactCode -eq 200 -and $FetchMethod -ne 'playwright') {
        $err = "http=$contactCode phone_missing"
      }
    }
    Write-Warning "[$WorkerId] Failed for $externalId ($err) body=\"$contactBodySnip\""
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
    $titleHeaders['Accept-Encoding'] = 'identity'
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
      Write-Host "[$WorkerId] Business title fetched for $businessRef -> \"$businessTitle\""
    } else {
      $snip = if ($titleContent) { $titleContent.Substring(0, [Math]::Min(300, $titleContent.Length)) } else { "" }
      Write-Warning "[$WorkerId] Business title not found (http $titleCode) for $businessRef body=\"$snip\""
    }
  }

  # Report
  $report = @{
    leaseId = $leaseId
    status  = if ($status) { $status } else { 'ok' }
  }
  if ($report.status -eq 'ok') {
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

