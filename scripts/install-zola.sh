#!/bin/sh
# Installs the pinned Zola release (linux x86_64) after checking its SHA-256, and puts it on PATH for
# the following steps of a GitHub Actions job. Used by CI and by the pipeline's SETUP_COMMAND.
# To bump: change VERSION and SHA256 together (the digest is on the release's asset page and in
# `gh api repos/getzola/zola/releases/tags/v<VERSION>`).
set -eu

VERSION=0.23.6
SHA256=8f5132b3522412d04e395e0b25f6d68613ad272a873e54a2b3ebf664873024a4
ASSET="zola-v${VERSION}-x86_64-unknown-linux-gnu.tar.gz"

# Overridable for tests only.
URL="${ZOLA_URL:-https://github.com/getzola/zola/releases/download/v${VERSION}/${ASSET}}"
EXPECTED="${ZOLA_SHA256:-$SHA256}"
DEST="${ZOLA_DEST:-$HOME/.local/bin}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

curl -fsSL --retry 3 -o "$work/zola.tar.gz" "$URL"

actual=$(sha256sum "$work/zola.tar.gz" | cut -d' ' -f1)
if [ "$actual" != "$EXPECTED" ]; then
  echo "install-zola: checksum mismatch: expected $EXPECTED, got $actual" >&2
  exit 1
fi

tar -xzf "$work/zola.tar.gz" -C "$work" zola
reported=$("$work/zola" --version)
if [ "$reported" != "zola $VERSION" ]; then
  echo "install-zola: unexpected version: got '$reported', expected 'zola $VERSION'" >&2
  exit 1
fi

mkdir -p "$DEST"
install -m 0755 "$work/zola" "$DEST/zola"
echo "install-zola: installed $reported to $DEST"

if [ -n "${GITHUB_PATH:-}" ]; then
  echo "$DEST" >> "$GITHUB_PATH"
fi
