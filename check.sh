#!/bin/bash

set -euo pipefail

echo "Formatting code with Prettier..."
pnpm format

echo "Running ESLint..."
pnpm lint

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

