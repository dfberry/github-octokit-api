#!/bin/bash
# Build all @dfb/* packages first, then the rest

set -e

# Find all package.json files in packages/*
ALL_PKG_JSONS=(packages/*/package.json)

# Get @dfb/* packages
DFB_PKGS=()
OTHER_PKGS=()
for PKG_JSON in "${ALL_PKG_JSONS[@]}"; do
  NAME=$(jq -r .name "$PKG_JSON")
  if [[ $NAME == @dfb/* ]]; then
    DFB_PKGS+=("$NAME")
  else
    OTHER_PKGS+=("$NAME")
  fi
done

# Build @dfb/* packages first
for PKG in "${DFB_PKGS[@]}"; do
  echo "Building $PKG..."
  npm run build -w "$PKG"
done

# Then build the rest
for PKG in "${OTHER_PKGS[@]}"; do
  echo "Building $PKG..."
  npm run build -w "$PKG"
done
