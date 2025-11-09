# Tenant Application

Simple TypeScript application that runs as a tenant instance.

## Features

- Express.js HTTP server
- Health check endpoint
- Tenant and instance ID display
- Dockerized for easy deployment

## Endpoints

- `GET /` - Returns tenant and instance information
- `GET /health` - Health check endpoint (returns status and uptime)
- `GET /inspect` - Inspection endpoint (returns detailed app information including memory usage, environment, etc.)

## Building

Build the Docker image and load it into kind from the project root:

```bash
pnpm build:app
```

Or run the script directly:

```bash
./build-app.sh
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `TENANT_ID` - Tenant identifier
- `INSTANCE_ID` - Instance identifier

## Installation

Install dependencies:

```bash
cd app
pnpm install
```

## Local Development

```bash
cd app
pnpm install
pnpm run build
pnpm start
```

