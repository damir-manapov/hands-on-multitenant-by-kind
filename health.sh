#!/bin/bash

set -euo pipefail

echo "Checking for vulnerabilities in packages (moderate severity and above)..."
AUDIT_OUTPUT=$(pnpm audit --audit-level=moderate 2>&1 || true)
echo "$AUDIT_OUTPUT"
if echo "$AUDIT_OUTPUT" | grep -q "No known vulnerabilities found"; then
  echo ""
  echo "Summary: No vulnerabilities found."
else
  echo ""
  echo "Summary: Vulnerabilities detected. Run 'pnpm audit --fix' to attempt automatic fixes."
fi

echo ""
echo "Checking for outdated dependencies..."
OUTDATED_OUTPUT=$(pnpm outdated 2>&1 || true)
echo "$OUTDATED_OUTPUT"
if echo "$OUTDATED_OUTPUT" | grep -q "Package.*Current.*Latest"; then
  echo "Summary: Some dependencies are outdated. Run 'pnpm update' to update them."
else
  echo "Summary: All dependencies are up to date."
fi

