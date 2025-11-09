#!/bin/bash

set -euo pipefail

echo "Checking for vulnerabilities in packages (moderate severity and above)..."
AUDIT_OUTPUT=$(timeout 30 pnpm audit --audit-level=moderate 2>&1)
AUDIT_EXIT=$?
echo "$AUDIT_OUTPUT"
if [ $AUDIT_EXIT -eq 124 ]; then
  echo "Error: Audit check timed out after 30 seconds"
  exit 1
fi
if echo "$AUDIT_OUTPUT" | grep -q "No known vulnerabilities found"; then
  echo ""
  echo "Summary: No vulnerabilities found."
else
  echo ""
  echo "Summary: Vulnerabilities detected. Run 'pnpm audit --fix' to attempt automatic fixes."
fi

echo ""
echo "Checking for outdated dependencies..."
OUTDATED_OUTPUT=$(timeout 30 pnpm outdated 2>&1)
OUTDATED_EXIT=$?
echo "$OUTDATED_OUTPUT"
if [ $OUTDATED_EXIT -eq 124 ]; then
  echo "Error: Outdated check timed out after 30 seconds"
  exit 1
fi
if echo "$OUTDATED_OUTPUT" | grep -q "Package.*Current.*Latest"; then
  echo "Summary: Some dependencies are outdated. Run 'pnpm update' to update them."
else
  echo "Summary: All dependencies are up to date."
fi

echo ""
echo "Checking tenant app dependencies..."
if [ -f "app/package.json" ]; then
  cd app
  echo "Inspecting tenant app package.json..."
  echo "Dependencies: $(jq -r '.dependencies | keys | length' package.json 2>/dev/null || echo "unknown")"
  echo "DevDependencies: $(jq -r '.devDependencies | keys | length' package.json 2>/dev/null || echo "unknown")"
  echo "Checking for vulnerabilities in tenant app..."
  APP_AUDIT_OUTPUT=$(timeout 30 pnpm audit --audit-level=moderate 2>&1)
  APP_AUDIT_EXIT=$?
  echo "$APP_AUDIT_OUTPUT" | head -10
  if [ $APP_AUDIT_EXIT -eq 124 ]; then
    echo "Error: Tenant app audit check timed out after 30 seconds"
    exit 1
  fi
  if echo "$APP_AUDIT_OUTPUT" | grep -q "No known vulnerabilities found"; then
    echo "Summary: No vulnerabilities found in tenant app."
  else
    echo "Summary: Vulnerabilities detected in tenant app."
  fi
  cd ..
else
  echo "Tenant app package.json not found, skipping."
fi

