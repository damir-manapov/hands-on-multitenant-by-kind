#!/bin/bash

set -euo pipefail

SKIP_RESET="${1:-}"

echo "=========================================="
echo "Starting Multitenant Demo"
echo "=========================================="
echo ""

# Setup kind cluster (includes ingress controller)
./setup-kind.sh "$SKIP_RESET"

# Build and load tenant app image
echo ""
echo "Building tenant app image..."
./build-app.sh

# Build and load API image
echo ""
echo "Building API image..."
./build-api.sh

# Deploy API to Kubernetes
echo ""
echo "Deploying API to Kubernetes..."
kubectl apply -f k8s/api-deployment.yaml

echo "Waiting for API deployment to be ready..."
kubectl wait --for=condition=available --timeout=90s deployment/multitenant-api || echo "Warning: API deployment may not be ready yet"

echo "Waiting for API to be ready..."
for i in {1..30}; do
  if curl -s http://api.localhost:8080/api/tenants > /dev/null 2>&1; then
    echo "API is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Warning: API may not be ready yet. Check with: kubectl logs -n default deployment/multitenant-api"
  fi
  sleep 2
done

echo ""
echo "Creating tenant 1: acme"
curl -s -X POST http://api.localhost:8080/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"id": "acme", "name": "Acme Corporation"}' | jq . || echo ""

echo ""
echo "Creating tenant 2: globex"
curl -s -X POST http://api.localhost:8080/api/tenants \
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

# Wait a moment for ingress to be ready
echo "Waiting for ingress to be ready..."
sleep 5

echo ""
echo "Checking /etc/hosts configuration..."

# Check if /etc/hosts has the required entries
HOSTS_OK=true
if ! grep -q "127.0.0.1.*api.localhost" /etc/hosts 2>/dev/null; then
  echo "  ⚠️  Missing: api.localhost"
  HOSTS_OK=false
fi

if ! grep -q "127.0.0.1.*acme.localhost" /etc/hosts 2>/dev/null; then
  echo "  ⚠️  Missing: acme.localhost"
  HOSTS_OK=false
fi

if ! grep -q "127.0.0.1.*globex.localhost" /etc/hosts 2>/dev/null; then
  echo "  ⚠️  Missing: globex.localhost"
  HOSTS_OK=false
fi

if [ "$HOSTS_OK" = true ]; then
  echo "  ✅ /etc/hosts is configured correctly"
else
  echo ""
  echo "  ❌ /etc/hosts is missing required entries"
  echo ""
  echo "  Please add the following to /etc/hosts:"
  echo "    127.0.0.1 api.localhost"
  echo "    127.0.0.1 acme.localhost"
  echo "    127.0.0.1 globex.localhost"
  echo ""
  echo "  You can do this with:"
  echo "    sudo bash -c 'echo \"127.0.0.1 api.localhost\" >> /etc/hosts'"
  echo "    sudo bash -c 'echo \"127.0.0.1 acme.localhost\" >> /etc/hosts'"
  echo "    sudo bash -c 'echo \"127.0.0.1 globex.localhost\" >> /etc/hosts'"
  echo ""
  echo "  Or edit /etc/hosts manually and add the entries above."
fi

echo ""
echo "✅ API and tenants are accessible via subdomains:"
echo ""
echo "  - API: http://api.localhost:8080/api"
echo "  - Acme tenant: http://acme.localhost:8080/"
echo "  - Globex tenant: http://globex.localhost:8080/"
echo ""
echo "Test with curl:"
echo "  curl http://api.localhost:8080/api/tenants"
echo "  curl http://acme.localhost:8080/"
echo "  curl http://globex.localhost:8080/"
echo ""
echo "API endpoints:"
echo "  - List tenants: curl http://api.localhost:8080/api/tenants"
echo "  - Get tenant: curl http://api.localhost:8080/api/tenants/acme"
echo ""
echo "To view API logs:"
echo "  kubectl logs -n default deployment/multitenant-api"
echo ""
echo "To delete API deployment:"
echo "  kubectl delete -f k8s/api-deployment.yaml"


