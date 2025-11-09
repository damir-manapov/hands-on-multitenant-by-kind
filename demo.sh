#!/bin/bash

set -euo pipefail

SKIP_RESET="${1:-}"

echo "=========================================="
echo "Starting Multitenant Demo"
echo "=========================================="
echo ""

# Handle cluster reset (default behavior)
if [ "$SKIP_RESET" = "--no-reset" ] || [ "$SKIP_RESET" = "-n" ]; then
  if ! kind get clusters | grep -q "multitenant-research"; then
    echo "Creating kind cluster..."
    kind create cluster --config kind-config.yaml
  else
    echo "Kind cluster already exists"
    echo "  (Use './demo.sh' without flags to reset the cluster)"
  fi
else
  echo "Resetting kind cluster..."
  if kind get clusters | grep -q "multitenant-research"; then
    kind delete cluster --name multitenant-research
    echo "Cluster deleted"
  fi
  echo "Creating new kind cluster..."
  kind create cluster --config kind-config.yaml
fi

# Build and load tenant app image
echo "Building tenant app image..."
./build-app.sh

echo ""
echo "Starting API server in background..."
cd "$(dirname "$0")"

# Kill any existing API servers
echo "Stopping any existing API servers..."
pkill -f "tsx watch src/main.ts" || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 3

# Build the project
echo "Building project..."
pnpm build

# Start new API server
echo "Starting API server..."
node dist/main.js > /tmp/api.log 2>&1 &
API_PID=$!
echo "API server started (PID: $API_PID)"
echo "Waiting for API to be ready..."

# Wait for API to be ready (check if it responds)
for i in {1..30}; do
  if curl -s http://localhost:3000/api/tenants > /dev/null 2>&1; then
    echo "API is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Error: API did not become ready after 30 seconds"
    echo "Check logs: tail -f /tmp/api.log"
    exit 1
  fi
  sleep 1
done

echo ""
echo "Creating tenant 1: acme"
curl -s -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"id": "acme", "name": "Acme Corporation"}' | jq . || echo ""

echo ""
echo "Creating tenant 2: globex"
curl -s -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"id": "globex", "name": "Globex Corporation"}' | jq . || echo ""

echo ""
echo "Waiting for instances to be ready..."
echo "Checking pod status..."
for i in {1..30}; do
  ACME_READY=$(kubectl get pods -n tenant-acme -l app=tenant-app -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "Pending")
  GLOBEX_READY=$(kubectl get pods -n tenant-globex -l app=tenant-app -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "Pending")
  if [ "$ACME_READY" = "Running" ] && [ "$GLOBEX_READY" = "Running" ]; then
    echo "Pods are running!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Warning: Pods may not be ready yet. Check with: kubectl get pods -n tenant-acme"
  fi
  sleep 1
done

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "API Server: http://localhost:3000/api"
echo ""

# Set up port forwarding in background
echo "Setting up port forwarding for tenant apps..."
kubectl port-forward -n tenant-acme service/acme 9090:9090 > /tmp/port-forward-acme.log 2>&1 &
PF_ACME_PID=$!
kubectl port-forward -n tenant-globex service/globex 9091:9090 > /tmp/port-forward-globex.log 2>&1 &
PF_GLOBEX_PID=$!

# Wait a moment for port forwarding to start
sleep 2

# Test if port forwarding is working
if curl -s http://localhost:9090/ > /dev/null 2>&1; then
  echo "✅ Port forwarding is active!"
  echo ""
  echo "You can now access:"
  echo "  - Acme tenant: http://localhost:9090/"
  echo "  - Globex tenant: http://localhost:9091/"
  echo ""
  echo "Test with curl:"
  echo "  curl http://localhost:9090/"
  echo "  curl http://localhost:9091/"
else
  echo "⚠️  Port forwarding started but may need a moment to be ready"
  echo "   If curl still fails, wait a few seconds and try again"
  echo ""
  echo "Port forwarding PIDs:"
  echo "  - Acme (port 9090): $PF_ACME_PID"
  echo "  - Globex (port 9091): $PF_GLOBEX_PID"
fi

echo ""
echo "API endpoints:"
echo "  - List tenants: curl http://localhost:3000/api/tenants"
echo "  - Get tenant: curl http://localhost:3000/api/tenants/acme"
echo ""
echo "To stop services:"
echo "  - API server: kill $API_PID"
echo "  - Port forwarding: kill $PF_ACME_PID $PF_GLOBEX_PID"
echo ""
echo "Or stop all: pkill -f 'node dist/main.js|kubectl port-forward'"


