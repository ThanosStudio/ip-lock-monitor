#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/verify-macos-dmg.sh path/to/App.dmg

Verifies the macOS release artifact before publishing:
  - DMG has a stapled notarization ticket.
  - DMG contains exactly one .app bundle.
  - App bundle has a valid deep strict code signature.
  - App bundle is signed by a Developer ID certificate, not ad-hoc.
  - App bundle has a stapled notarization ticket.
USAGE
}

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

dmg_path="${1:-}"
[[ -n "$dmg_path" ]] || fail "DMG path is required."
[[ -f "$dmg_path" ]] || fail "DMG does not exist: $dmg_path"

require_command codesign
require_command hdiutil
require_command xcrun

printf '==> Validating stapled notarization ticket on DMG\n'
xcrun stapler validate "$dmg_path"

mount_dir="$(mktemp -d "${TMPDIR:-/tmp}/ip-monitor-dmg.XXXXXX")"
device=""

cleanup() {
  if [[ -n "$device" ]]; then
    hdiutil detach "$device" -quiet >/dev/null 2>&1 || true
  fi
  rmdir "$mount_dir" >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '==> Mounting DMG read-only\n'
attach_output="$(hdiutil attach -readonly -nobrowse -noverify -mountpoint "$mount_dir" "$dmg_path")"
device="$(printf '%s\n' "$attach_output" | awk 'NR == 1 { print $1 }')"
[[ -n "$device" ]] || fail "Could not determine mounted DMG device."

mapfile -t app_paths < <(find "$mount_dir" -maxdepth 1 -type d -name '*.app' -print | sort)
[[ "${#app_paths[@]}" -eq 1 ]] || fail "Expected exactly one .app in DMG, found ${#app_paths[@]}."
app_path="${app_paths[0]}"

printf '==> Verifying app bundle signature\n'
codesign --verify --deep --strict --verbose=4 "$app_path"

signature_info="$(codesign -dv --verbose=4 "$app_path" 2>&1)"
if printf '%s\n' "$signature_info" | grep -q '^Signature=adhoc$'; then
  fail "App is ad-hoc signed. Use a Developer ID Application certificate for public DMG distribution."
fi
if ! printf '%s\n' "$signature_info" | grep -q '^Authority=Developer ID Application:'; then
  printf '%s\n' "$signature_info" >&2
  fail "App is not signed with a Developer ID Application certificate."
fi
if ! printf '%s\n' "$signature_info" | grep -q '^TeamIdentifier='; then
  printf '%s\n' "$signature_info" >&2
  fail "App signature has no TeamIdentifier."
fi

printf '==> Validating stapled notarization ticket on app bundle\n'
xcrun stapler validate "$app_path"

printf 'macOS DMG verification passed: %s\n' "$dmg_path"
