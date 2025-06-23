#!/bin/bash

# Script to test GitHub token permissions

echo "🔑 GitHub Token Permission Checker"
echo "=================================="

# Check if node is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js to run this script."
  exit 1
fi

# Check if token is provided
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GitHub token not found in environment."
  echo "Enter your GitHub token (it will not be displayed):"
  read -s token
  echo ""
  
  if [ -z "$token" ]; then
    echo "No token provided. Exiting."
    exit 1
  fi
  
  export GITHUB_TOKEN="$token"
fi

# Run the token check script
echo "Running permission check with provided token..."

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
cd "$SCRIPT_DIR"/../
npx ts-node src/quick/check-token-scope.ts
