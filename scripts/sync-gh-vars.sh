#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.prod"

# Variables that should be GitHub Secrets (not plain variables)
SECRET_NAMES=(
  POSTGRES_PASSWORD
  MINIO_ACCESS_KEY
  MINIO_SECRET_KEY
  JWT_ACCESS_TOKEN_SECRET
  JWT_REFRESH_TOKEN_SECRET
  RABBITMQ_PASSWORD
  TELEGRAM_BOT_TOKEN
  BALE_BOT_TOKEN
  GRAFANA_ADMIN_PASSWORD
  OTP_SENDER_API_KEY
  NEXT_PUBLIC_ANALYTICS_WRITE_KEY
  NEXT_PUBLIC_VAPID_PUBLIC_KEY
  VAPID_PUBLIC_KEY
  VAPID_PRIVATE_KEY
  VAPID_SUBJECT
  PUSH_NOTIFICATION_TIMEOUT_MS
  CLOUDFLARE_API_TOKEN
)

is_secret() {
  local name="$1"
  for s in "${SECRET_NAMES[@]}"; do
    [[ "$s" == "$name" ]] && return 0
  done
  return 1
}

to_gh_name() {
  local raw="$1"
  # Strip GH_SECRET_ prefix if present
  echo "${raw#GH_SECRET_}"
}

ensure_gh() {
  if ! command -v gh &>/dev/null; then
    echo "Installing GitHub CLI..."
    if command -v apt-get &>/dev/null; then
      curl -fsSL --noproxy '*' https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
      sudo http_proxy= https_proxy= apt-get update -qq && sudo http_proxy= https_proxy= apt-get install -y -qq gh
    else
      echo "ERROR: Unsupported package manager. Install gh manually: https://cli.github.com/"
      exit 1
    fi
    echo "gh installed. Run 'gh auth login' to authenticate, then re-run this script."
    exit 0
  fi

  if ! gh auth status &>/dev/null; then
    if [[ -n "${GITHUB_TOKEN:-}${GH_TOKEN:-}" ]]; then
      echo "Authenticating with GITHUB_TOKEN/GH_TOKEN..."
      echo "${GITHUB_TOKEN:-$GH_TOKEN}" | gh auth login --with-token
    else
      echo "Not logged in. Starting browser-based login..."
      echo "A browser window will open. Follow the instructions to authenticate."
      gh auth login -h github.com --web || {
        echo "Web login failed. Try: gh auth login -h github.com"
        exit 1
      }
    fi
  fi
}

get_repo() {
  gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || {
    echo "ERROR: Not in a GitHub repo or unable to determine remote."
    exit 1
  }
}

upsert_variable() {
  local repo="$1" name="$2" value="$3"
  local current
  current=$(gh variable list --repo "$repo" --jq ".variables[] | select(.name == \"$name\") | .value" 2>/dev/null || true)
  if [[ "$current" == "$value" ]]; then
    echo "  ✓ $name (unchanged)"
  else
    if [[ -n "$current" ]]; then
      gh variable set "$name" --body "$value" --repo "$repo"
      echo "  ~ $name (updated)"
    else
      gh variable set "$name" --body "$value" --repo "$repo"
      echo "  + $name (created)"
    fi
  fi
}

upsert_secret() {
  local repo="$1" name="$2" value="$3"
  local current
  current=$(gh secret list --repo "$repo" --jq ".secrets[] | select(.name == \"$name\") | .name" 2>/dev/null || true)
  if [[ -n "$current" ]]; then
    # GitHub doesn't expose secret values for comparison, always update
    gh secret set "$name" --body "$value" --repo "$repo"
    echo "  ~ $name (secret updated)"
  else
    gh secret set "$name" --body "$value" --repo "$repo"
    echo "  + $name (secret created)"
  fi
}

parse_env() {
  local line name rest
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^# ]] && continue

    if [[ "$line" =~ ^([a-zA-Z_][a-zA-Z0-9_]*)=(.*) ]]; then
      name="${BASH_REMATCH[1]}"
      rest="${BASH_REMATCH[2]}"

      # Remove surrounding quotes
      rest="${rest%[\"\']}"
      rest="${rest#[\"\']}"

      # Skip vars with unresolved ${...} references (they depend on runtime context)
      if [[ "$rest" =~ \$\{ ]]; then
        echo "  - $name (skipped — contains variable reference)"
        continue
      fi

      echo "$name=$rest"
    fi
  done < "$ENV_FILE"
}

main() {
  # Bypass proxy for all GitHub operations
  unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY
  echo "=== GitHub Variables/Secrets Sync ==="
  echo "Env file: $ENV_FILE"
  echo ""

  ensure_gh
  local repo
  repo=$(get_repo)
  echo "Repo: $repo"
  echo ""

  local name value gh_name
  while IFS='=' read -r name value; do
    [[ -z "$name" ]] && continue

    gh_name=$(to_gh_name "$name")

    if is_secret "$gh_name"; then
      echo "Secret: $gh_name"
      upsert_secret "$repo" "$gh_name" "$value"
    else
      echo "Variable: $gh_name"
      upsert_variable "$repo" "$gh_name" "$value"
    fi
  done < <(parse_env)

  echo ""
  echo "=== Done ==="
}

main "$@"
