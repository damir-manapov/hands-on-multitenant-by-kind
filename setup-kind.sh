#!/bin/bash

set -euo pipefail

SKIP_RESET="${1:-}"

echo "=========================================="
echo "Setting up kind cluster"
echo "=========================================="
echo ""

# Handle cluster reset (default behavior)
if [ "$SKIP_RESET" = "--no-reset" ] || [ "$SKIP_RESET" = "-n" ]; then
  if ! kind get clusters | grep -q "multitenant-research"; then
    echo "Creating kind cluster..."
    kind create cluster --config kind-config.yaml
  else
    echo "Kind cluster already exists"
    echo "  (Use './setup-kind.sh' without flags to reset the cluster)"
    exit 0
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

# Wait for cluster to be fully ready
echo ""
echo "Waiting for cluster to be fully ready..."
echo "Waiting for all nodes to be ready..."
for i in {1..60}; do
  if kubectl wait --for=condition=Ready nodes --all --timeout=10s > /dev/null 2>&1; then
    echo "All nodes are ready"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "Warning: Not all nodes are ready, but continuing..."
  fi
  sleep 2
done

echo "Waiting for core system pods to be running..."
for i in {1..60}; do
  # Check if CoreDNS and kube-proxy are running
  COREDNS_READY=$(kubectl get pods -n kube-system -l k8s-app=kube-dns --no-headers 2>/dev/null | grep -c "Running" || echo "0")
  KUBE_PROXY_READY=$(kubectl get pods -n kube-system -l k8s-app=kube-proxy --no-headers 2>/dev/null | grep -c "Running" || echo "0")
  if [ "$COREDNS_READY" -ge "1" ] && [ "$KUBE_PROXY_READY" -ge "1" ]; then
    echo "Core system pods are running"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "Warning: Some core system pods may not be ready, but continuing..."
    echo "CoreDNS running: $COREDNS_READY, kube-proxy running: $KUBE_PROXY_READY"
  fi
  sleep 2
done

# Give the cluster a moment to stabilize
echo "Allowing cluster to stabilize..."
sleep 5

# Install nginx-ingress controller
echo ""
echo "Installing nginx-ingress controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for namespace to exist
echo "Waiting for ingress-nginx namespace..."
for i in {1..30}; do
  if kubectl get namespace ingress-nginx > /dev/null 2>&1; then
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Error: ingress-nginx namespace not found"
    exit 1
  fi
  sleep 1
done

# Wait for admission webhook jobs to complete (they create the secret needed by the controller)
echo "Waiting for admission webhook jobs to complete..."
for i in {1..120}; do
  # First check if the secret already exists (job might have completed quickly)
  if kubectl get secret -n ingress-nginx ingress-nginx-admission > /dev/null 2>&1; then
    echo "Admission webhook secret found"
    break
  fi
  
  # Check if admission-create job exists
  if kubectl get job -n ingress-nginx ingress-nginx-admission-create > /dev/null 2>&1; then
    # Check if job is complete
    if kubectl wait --namespace ingress-nginx \
      --for=condition=complete \
      --timeout=5s \
      job/ingress-nginx-admission-create > /dev/null 2>&1; then
      # Job completed, check for secret
      if kubectl get secret -n ingress-nginx ingress-nginx-admission > /dev/null 2>&1; then
        echo "Admission webhook jobs completed and secret created"
        break
      fi
    else
      # Check if job failed
      JOB_STATUS=$(kubectl get job -n ingress-nginx ingress-nginx-admission-create -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null || echo "")
      if [ "$JOB_STATUS" = "True" ]; then
        echo "Warning: Admission webhook job failed, checking logs..."
        JOB_POD=$(kubectl get pods -n ingress-nginx -l job-name=ingress-nginx-admission-create -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        if [ -n "$JOB_POD" ]; then
          kubectl logs -n ingress-nginx "$JOB_POD" 2>&1 | tail -10 || true
        fi
        # Delete the failed job to allow retry
        echo "Deleting failed job to allow retry..."
        kubectl delete job -n ingress-nginx ingress-nginx-admission-create || true
        sleep 5
        # Re-apply the ingress controller to recreate the job
        echo "Re-applying ingress controller to recreate jobs..."
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
        continue
      fi
    fi
  fi
  
  if [ $((i % 10)) -eq 0 ]; then
    echo "  Still waiting for admission webhook... (attempt $i/120)"
    # Show job status for debugging
    kubectl get jobs -n ingress-nginx || true
  fi
  
  if [ $i -eq 120 ]; then
    echo "Error: Admission webhook jobs did not complete after 10 minutes"
    echo "Job status:"
    kubectl get jobs -n ingress-nginx || true
    echo ""
    echo "Job pod logs:"
    JOB_POD=$(kubectl get pods -n ingress-nginx -l job-name=ingress-nginx-admission-create -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$JOB_POD" ]; then
      kubectl logs -n ingress-nginx "$JOB_POD" 2>&1 | tail -20 || true
    fi
    # Check if secret exists anyway
    if kubectl get secret -n ingress-nginx ingress-nginx-admission > /dev/null 2>&1; then
      echo "Secret exists despite job status, continuing..."
      break
    else
      echo "Secret does not exist, this may cause issues"
    fi
  fi
  sleep 5
done

# Wait for controller pod to exist
echo "Waiting for ingress controller pod to be created..."
for i in {1..30}; do
  if kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller --no-headers 2>/dev/null | grep -q .; then
    echo "Controller pod found"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Error: Controller pod not found"
    kubectl get pods -n ingress-nginx || true
    exit 1
  fi
  sleep 1
done

# Wait for controller pod to be ready
echo "Waiting for ingress controller to be ready..."
for i in {1..120}; do
  if kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=5s > /dev/null 2>&1; then
    echo "Ingress controller is ready"
    break
  fi
  if [ $((i % 10)) -eq 0 ]; then
    echo "  Still waiting... (attempt $i/120)"
    # Show pod status for debugging
    kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller || true
  fi
  if [ $i -eq 120 ]; then
    echo "Error: Ingress controller did not become ready after 10 minutes"
    echo "Controller pod status:"
    kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller || true
    echo ""
    echo "Controller pod events:"
    CONTROLLER_POD=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$CONTROLLER_POD" ]; then
      kubectl describe pod -n ingress-nginx "$CONTROLLER_POD" 2>&1 | tail -20 || true
    fi
    exit 1
  fi
  sleep 5
done

# Give ingress controller a moment to fully initialize
echo "Waiting for ingress controller to fully initialize..."
sleep 5

# Patch ingress controller to run on control-plane node (which has port mapping)
echo ""
echo "Configuring ingress controller to run on control-plane node..."
kubectl patch deployment -n ingress-nginx ingress-nginx-controller --type='json' -p='[{"op": "add", "path": "/spec/template/spec/nodeSelector/ingress-ready", "value": "true"}]' || {
  echo "Warning: Failed to patch ingress controller deployment"
  echo "The ingress controller may not be accessible on port 8080"
}

# Wait for the patched controller to be ready
echo "Waiting for ingress controller to restart on control-plane node..."
for i in {1..60}; do
  if kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=5s > /dev/null 2>&1; then
    # Verify it's on the control-plane node
    CONTROLLER_NODE=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].spec.nodeName}' 2>/dev/null || echo "")
    if echo "$CONTROLLER_NODE" | grep -q "control-plane"; then
      echo "Ingress controller is running on control-plane node"
      break
    fi
  fi
  if [ $i -eq 60 ]; then
    echo "Warning: Ingress controller may not be on control-plane node"
    echo "Current node: $(kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].spec.nodeName}' 2>/dev/null || echo 'unknown')"
  fi
  sleep 2
done

echo ""
echo "=========================================="
echo "Kind cluster setup complete"
echo "=========================================="

