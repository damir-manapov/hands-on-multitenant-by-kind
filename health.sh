#!/bin/bash

set -euo pipefail

echo "Checking for vulnerabilities in packages..."
pnpm audit --audit-level=moderate

echo ""
echo "Checking for outdated dependencies..."
pnpm outdated

