#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/release.sh --repo OWNER/ip-lock-monitor [--remote-url git@github.com:OWNER/ip-lock-monitor.git] [--tag v0.1.0] [--title "IP Monitor v0.1.0"] [--notes-file RELEASE_NOTES.md] [--dry-run]

Environment:
  GITHUB_REPOSITORY  Optional fallback for --repo. Must end with /ip-lock-monitor.
  GIT_REMOTE_URL     Optional git remote URL. Defaults to https://github.com/OWNER/ip-lock-monitor.git.
  DRY_RUN=1          Print commands without running build, git push, or GitHub release.

Examples:
  scripts/release.sh --repo your-github-name/ip-lock-monitor --remote-url git@github.com:your-github-name/ip-lock-monitor.git
  DRY_RUN=1 scripts/release.sh --repo your-github-name/ip-lock-monitor
USAGE
}

log() {
  printf '\033[1;34m==>\033[0m %s\n' "$*"
}

fail() {
  printf '\033[1;31merror:\033[0m %s\n' "$*" >&2
  exit 1
}

run() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
  if [[ "${DRY_RUN:-0}" != "1" ]]; then
    "$@"
  fi
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

repo="${GITHUB_REPOSITORY:-}"
remote_url="${GIT_REMOTE_URL:-}"
tag=""
title=""
notes_file=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      repo="${2:-}"
      shift 2
      ;;
    --remote-url)
      remote_url="${2:-}"
      shift 2
      ;;
    --tag)
      tag="${2:-}"
      shift 2
      ;;
    --title)
      title="${2:-}"
      shift 2
      ;;
    --notes-file)
      notes_file="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

require_command git
require_command npm
require_command shasum
require_command node
require_command gh

[[ -n "$repo" ]] || fail "GitHub repository is required. Pass --repo OWNER/ip-lock-monitor or set GITHUB_REPOSITORY."
[[ "$repo" == */ip-lock-monitor ]] || fail "Refusing to publish to '$repo'. Repository name must be ip-lock-monitor."

version="$(node -p "require('./package.json').version")"
[[ -n "$tag" ]] || tag="v$version"
[[ -n "$title" ]] || title="IP Monitor $tag"

if [[ -n "$notes_file" && ! -f "$notes_file" ]]; then
  fail "Release notes file does not exist: $notes_file"
fi

current_branch="$(git branch --show-current)"
[[ -n "$current_branch" ]] || fail "Cannot determine current git branch."

if [[ "${DRY_RUN:-0}" != "1" ]]; then
  git diff --quiet || fail "Working tree has uncommitted changes. Commit or stash before releasing."
  git diff --cached --quiet || fail "Index has staged but uncommitted changes. Commit before releasing."
  gh auth status >/dev/null || fail "GitHub CLI is not authenticated. Run: gh auth login"
fi

log "Running tests and building the Tauri dmg"
run npm test -- --run
run npm run build
run npm run tauri -- build

dmg_path="$(find src-tauri/target/release/bundle/dmg -maxdepth 1 -type f -name '*.dmg' -print 2>/dev/null | sort | tail -n 1 || true)"
if [[ "${DRY_RUN:-0}" == "1" && -z "$dmg_path" ]]; then
  dmg_path="src-tauri/target/release/bundle/dmg/IP Monitor_${version}_aarch64.dmg"
fi
[[ -n "$dmg_path" ]] || fail "No dmg found under src-tauri/target/release/bundle/dmg."

sha_path="${dmg_path}.sha256"
log "Generating sha256 checksum"
run shasum -a 256 "$dmg_path"
if [[ "${DRY_RUN:-0}" != "1" ]]; then
  shasum -a 256 "$dmg_path" > "$sha_path"
else
  printf '+ shasum -a 256 %q > %q\n' "$dmg_path" "$sha_path"
fi

log "Pushing code to GitHub repository $repo"
if [[ -z "$remote_url" ]]; then
  remote_url="https://github.com/${repo}.git"
fi
if git remote get-url origin >/dev/null 2>&1; then
  run git remote set-url origin "$remote_url"
else
  run git remote add origin "$remote_url"
fi
run git push -u origin "$current_branch"

if git rev-parse "$tag" >/dev/null 2>&1; then
  log "Tag $tag already exists locally"
else
  run git tag -a "$tag" -m "$title"
fi
run git push origin "$tag"

release_args=(release create "$tag" "$dmg_path" "$sha_path" --repo "$repo" --title "$title")
if [[ -n "$notes_file" ]]; then
  release_args+=(--notes-file "$notes_file")
else
  release_args+=(--notes "See README.md for features and usage. SHA-256 checksum is attached as a separate asset.")
fi

log "Publishing GitHub release $tag"
run gh "${release_args[@]}"

log "Release flow finished"
printf 'DMG: %s\nSHA256: %s\nRelease: https://github.com/%s/releases/tag/%s\n' "$dmg_path" "$sha_path" "$repo" "$tag"
