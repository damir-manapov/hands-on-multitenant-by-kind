# Multitenant Spinning App

A multitenant application for managing tenant instances using Kubernetes (kind) for local development. Built with TypeScript, pnpm, and tsx, featuring strict type checking, ESLint, and Prettier configurations.

## Prerequisites

Before setting up the project, ensure you have the following tools installed on your system.

### Required Tools

#### 1. Node.js (v20 or higher)

**Installation:**

- **Using nvm (recommended):**
  ```bash
  # Install nvm (if not already installed)
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  source ~/.bashrc
  
  # Install latest LTS Node.js
  nvm install --lts
  nvm use --lts
  ```

- **Using package manager (Ubuntu/Debian):**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- **Verify installation:**
  ```bash
  node --version
  npm --version
  ```

#### 2. pnpm (v10 or higher)

**Installation:**

- **Using npm:**
  ```bash
  npm install -g pnpm
  ```

- **Using standalone script:**
  ```bash
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  source ~/.bashrc
  ```

- **Using package manager (Ubuntu/Debian):**
  ```bash
  # Add pnpm repository
  wget -qO- https://get.pnpm.io/install.sh | sh -
  source ~/.bashrc
  ```

- **Verify installation:**
  ```bash
  pnpm --version
  ```

#### 3. Docker

**Installation:**

- **Ubuntu/Debian:**
  ```bash
  # Remove old versions
  sudo apt-get remove docker docker-engine docker.io containerd runc
  
  # Install prerequisites
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg lsb-release
  
  # Add Docker's official GPG key
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  
  # Set up repository
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  
  # Install Docker
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  
  # Add user to docker group (requires logout/login)
  sudo usermod -aG docker $USER
  ```

- **Verify installation:**
  ```bash
  docker --version
  docker ps
  ```

#### 4. kind (Kubernetes in Docker)

**Installation:**

- **Using binary (recommended):**
  ```bash
  # Download latest release
  curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
  chmod +x ./kind
  sudo mv ./kind /usr/local/bin/kind
  ```

- **Using package manager:**
  ```bash
  # Using go install (if Go is installed)
  go install sigs.k8s.io/kind@latest
  ```

- **Verify installation:**
  ```bash
  kind --version
  ```

#### 5. kubectl (Kubernetes command-line tool)

**Installation:**

- **Using package manager (Ubuntu/Debian):**
  ```bash
  # Download latest stable release
  curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  
  # Install
  chmod +x kubectl
  sudo mv kubectl /usr/local/bin/
  ```

- **Using snap:**
  ```bash
  sudo snap install kubectl --classic
  ```

- **Verify installation:**
  ```bash
  kubectl version --client
  ```

#### 6. gitleaks (Secret scanning)

**Installation:**

- **Using binary:**
  ```bash
  # Download latest release
  wget https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks-linux-amd64 -O gitleaks
  chmod +x gitleaks
  sudo mv gitleaks /usr/local/bin/
  ```

- **Using package manager:**
  ```bash
  # Using go install (if Go is installed)
  go install github.com/gitleaks/gitleaks/v8@latest
  ```

- **Using package manager (Homebrew on macOS):**
  ```bash
  brew install gitleaks
  ```

- **Verify installation:**
  ```bash
  gitleaks version
  ```

## Project Setup

Once all prerequisites are installed, set up the project:

### 1. Navigate to Project Directory

```bash
cd <project-directory>
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all project dependencies including:
- TypeScript and type definitions
- ESLint and Prettier with strict configurations
- Kubernetes client library
- Development tools (tsx, etc.)

### 3. Create kind Cluster

```bash
kind create cluster --config kind-config.yaml
```

This creates a Kubernetes cluster with:
- 1 control-plane node
- 2 worker nodes
- Port mappings for ingress (80→8080, 443→8443)

### 4. Install Tenant App Dependencies

Install dependencies for the tenant application:

```bash
cd app
pnpm install
cd ..
```

### 5. Build Tenant App Docker Image

Build the tenant application Docker image and load it into the kind cluster:

```bash
pnpm build:app
```

Or run the script directly:

```bash
./build-app.sh
```

This will:
- Build the TypeScript tenant application
- Create a Docker image named `tenant-app:latest`
- Load the image into the kind cluster

### 6. Verify Cluster

```bash
# Check cluster info
kubectl cluster-info --context kind-multitenant-research

# Set context (if needed)
kubectl config use-context kind-multitenant-research

# Verify nodes
kubectl get nodes
```

## Development

### Testing Tenant App Locally

To test the tenant app locally before deploying to Kubernetes:

```bash
cd app
pnpm install
pnpm run build
TENANT_ID=acme INSTANCE_ID=instance-1 pnpm start
```

**Note:** If port 9090 is already in use, specify a different port:
```bash
PORT=9091 TENANT_ID=acme INSTANCE_ID=instance-1 pnpm start
```

The app will start on `http://localhost:9090` (or the port specified by `PORT`). You can test it:

```bash
# Check the root endpoint
curl http://localhost:9090/

# Check health endpoint
curl http://localhost:9090/health

# Check inspect endpoint
curl http://localhost:9090/inspect
```

### Run in Development Mode

```bash
pnpm dev
```

This starts the NestJS REST API server with hot-reload using `tsx watch`. The API will be available at `http://localhost:3000/api`.

### Build the Project

```bash
pnpm build
```

### Run the Built Application

```bash
pnpm start
```

### Code Quality Scripts

#### Format Code

```bash
pnpm format
```

#### Check Code Formatting

```bash
pnpm format:check
```

#### Run Linter

```bash
pnpm lint
```

#### Type Check (No Emit)

```bash
pnpm type-check
```

## Utility Scripts

### check.sh - Comprehensive Code Quality Check

This script performs all code quality checks:

```bash
./check.sh
```

**What it does:**
1. ✅ Formats code with Prettier
2. ✅ Runs ESLint with strict rules
3. ✅ Checks tenant app source code structure and compilation
4. ✅ Scans for secret leaks using gitleaks
5. ✅ Performs TypeScript type checking (no emit)

**Output:** Color-coded, informative output showing the status of each check.

### health.sh - Dependency Health Check

This script checks the health of your dependencies:

```bash
./health.sh
```

**What it does:**
1. ✅ Checks for vulnerabilities in packages (moderate+ severity)
2. ✅ Lists outdated dependencies
3. ✅ Checks tenant app dependencies for vulnerabilities

**Output:** Detailed information about vulnerabilities and outdated packages with suggestions.

## Project Structure

```
.
├── app/                        # Tenant application
│   ├── src/
│   │   └── index.ts           # Simple Express.js app
│   ├── Dockerfile             # Docker image for tenant app
│   └── package.json           # App dependencies
├── build-app.sh               # Build and load tenant app script
├── src/
│   ├── types/
│   │   └── tenant.ts          # Type definitions for tenants and instances
│   ├── services/
│   │   ├── kubernetes.ts      # Kubernetes API integration
│   │   └── tenant.ts          # Tenant management service
│   ├── tenants/
│   │   ├── tenants.controller.ts  # REST API controller for tenants
│   │   ├── tenants.service.ts     # NestJS service for tenants
│   │   └── tenants.module.ts      # NestJS module for tenants
│   ├── dto/
│   │   ├── create-tenant.dto.ts      # DTO for creating tenants
│   │   └── create-instance.dto.ts    # DTO for creating instances
│   ├── app.module.ts          # Main NestJS application module
│   ├── main.ts                # NestJS application entry point
│   └── index.ts               # Demo/example script
├── k8s/
│   ├── namespace.yaml         # Example namespace definitions
│   └── instance.yaml.template  # Template for instances
├── kind-config.yaml           # kind cluster configuration
├── tsconfig.json              # Strict TypeScript configuration
├── .eslintrc.json             # Strict ESLint configuration
├── .prettierrc.json           # Prettier formatting rules
├── .prettierignore            # Files to ignore for Prettier
├── check.sh                   # Code quality check script
├── health.sh                   # Dependency health check script
├── package.json               # Project dependencies and scripts
└── README.md                  # This file
```

## Configuration Details

### TypeScript Configuration

The project uses **strict TypeScript configuration** with:
- All strict type-checking options enabled
- No implicit any
- Strict null checks
- Strict function types
- No unchecked indexed access
- No implicit override
- And more...

### ESLint Configuration

The project uses **strict ESLint rules** including:
- TypeScript strict type-checked rules
- Explicit function return types required
- No unsafe assignments/calls/returns
- Strict boolean expressions
- Prettier integration

### Prettier Configuration

Code formatting is enforced with:
- Single quotes
- Semicolons
- Trailing commas
- 100 character line width
- 2 space indentation

## REST API

The application provides a REST API built with NestJS for managing tenants and instances.

### API Endpoints

All endpoints are prefixed with `/api`.

#### Tenants

- **POST** `/api/tenants` - Create a new tenant
  ```json
  {
    "id": "acme",
    "name": "Acme Corporation"
  }
  ```

- **GET** `/api/tenants` - List all tenants

- **GET** `/api/tenants/:id` - Get a specific tenant by ID

#### Instances

- **POST** `/api/tenants/:id/instances` - Create an instance for a tenant
  ```json
  {
    "instanceId": "instance-1"
  }
  ```

- **GET** `/api/tenants/:id/instances` - List all instances for a tenant

- **GET** `/api/tenants/:id/instances/:instanceId` - Get a specific instance

- **DELETE** `/api/tenants/:id/instances/:instanceId` - Delete an instance

### Example API Usage

```bash
# Create a tenant
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"id": "acme", "name": "Acme Corporation"}'

# List all tenants
curl http://localhost:3000/api/tenants

# Create an instance
curl -X POST http://localhost:3000/api/tenants/acme/instances \
  -H "Content-Type: application/json" \
  -d '{"instanceId": "instance-1"}'

# List instances for a tenant
curl http://localhost:3000/api/tenants/acme/instances

# Get a specific instance
curl http://localhost:3000/api/tenants/acme/instances/instance-1

# Delete an instance
curl -X DELETE http://localhost:3000/api/tenants/acme/instances/instance-1
```

## Usage

The application demonstrates a multitenant architecture where:

1. **Tenants** are isolated in separate Kubernetes namespaces
2. **Instances** are deployed as Kubernetes deployments within tenant namespaces
3. Each tenant can have multiple instances

### Example Workflow

1. Create a tenant:
   ```typescript
   const tenant = await tenantService.createTenant('acme', 'Acme Corporation');
   ```

2. Create an instance for a tenant:
   ```typescript
   const instance = await tenantService.createInstance('acme', 'instance-1');
   ```

3. List instances:
   ```typescript
   const instances = await tenantService.listInstances('acme');
   ```

4. Check instance status:
   ```typescript
   const status = await tenantService.getInstance('acme', 'instance-1');
   ```

## Kubernetes Operations

**View all namespaces:**
```bash
kubectl get namespaces
```

**View deployments for a tenant:**
```bash
kubectl get deployments -n tenant-acme
```

**View services for a tenant:**
```bash
kubectl get services -n tenant-acme
```

**View pods for a tenant:**
```bash
kubectl get pods -n tenant-acme
```

**View pod logs:**
```bash
kubectl logs -n tenant-acme deployment/instance-instance-1
```

**Delete an instance:**
```bash
kubectl delete deployment instance-instance-1 -n tenant-acme
kubectl delete service instance-instance-1 -n tenant-acme
```

**Delete a tenant namespace:**
```bash
kubectl delete namespace tenant-acme
```

## Cleanup

**Delete the kind cluster:**
```bash
kind delete cluster --name multitenant-research
```

## Troubleshooting

### kubectl can't connect to the cluster

```bash
kubectl config use-context kind-multitenant-research
```

### Cluster is not running

```bash
# Check if cluster exists
kind get clusters

# If multitenant-research is not listed, recreate it:
kind create cluster --config kind-config.yaml
```

### Check cluster status

```bash
# Check Docker containers
docker ps | grep kind

# Check cluster nodes
kubectl get nodes
```

### gitleaks not found

If `check.sh` reports gitleaks is not found:
1. Install gitleaks following the instructions in the Prerequisites section
2. Ensure it's in your PATH: `which gitleaks`
3. Verify it works: `gitleaks version`

### ESLint/TypeScript errors

The project uses strict configurations. If you encounter errors:
1. Run `pnpm format` to format code
2. Run `pnpm lint` to see specific linting errors
3. Run `pnpm type-check` to see type errors
4. Fix errors according to the strict rules

### Dependency vulnerabilities

If `health.sh` reports vulnerabilities:
```bash
# Attempt automatic fixes
pnpm audit --fix

# Review and update manually if needed
pnpm update
```

## Development Notes

- The application uses the Kubernetes client library to interact with the cluster
- Each tenant gets its own namespace: `tenant-{tenantId}`
- Instances are deployed as Kubernetes deployments with associated services
- Instances run the tenant application Docker image (`tenant-app:latest`)
- All code must pass strict TypeScript, ESLint, and Prettier checks
- Secret scanning is performed on every check to prevent credential leaks

## License

MIT
