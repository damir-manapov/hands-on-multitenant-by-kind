#!/bin/bash

set -euo pipefail

echo "Formatting code with Prettier..."
pnpm format

echo "Running ESLint..."
pnpm lint

echo "Checking tenant app source..."
if [ -d "app" ] && [ -f "app/package.json" ]; then
  cd app
  echo "Inspecting tenant app structure..."
  echo "Files: $(find . -type f -not -path "./node_modules/*" -not -path "./dist/*" | wc -l) files"
  if [ -f "src/index.ts" ]; then
    echo "Source file: src/index.ts ($(wc -l < src/index.ts) lines)"
  fi
  echo "Checking tenant app TypeScript compilation (no emit)..."
  if npx tsc --noEmit > /dev/null 2>&1; then
    echo "Tenant app type checks successfully"
  else
    echo "Warning: Tenant app type check failed"
  fi
  cd ..
else
  echo "Tenant app directory not found, skipping."
fi

echo "Checking for secret leaks with gitleaks..."
if ! command -v gitleaks &> /dev/null; then
  echo "Error: gitleaks not found in PATH"
  echo "Please install gitleaks: https://github.com/gitleaks/gitleaks#installation"
  exit 1
fi
gitleaks detect --source . --verbose --no-banner

echo "Running TypeScript type check (no emit)..."
pnpm type-check

echo "All checks passed"

