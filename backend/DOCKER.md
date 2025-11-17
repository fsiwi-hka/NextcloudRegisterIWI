# Nextcloud Registration Backend - Docker Setup

## Prerequisites
- Docker and Docker Compose installed
- Portainer (optional, for GUI management)

## Quick Start with Docker Compose

### 1. Configure Environment Variables

Create a `.env` file in the `backend` directory with your configuration:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Nextcloud Configuration
NEXTCLOUD_URL=https://your-nextcloud-url
NEXTCLOUD_ADMIN_USER=admin
NEXTCLOUD_ADMIN_PASSWORD="your#password#here"
NEXTCLOUD_DEFAULT_GROUP=IWI

# Raumzeit Configuration
RAUMZEIT_URL=https://raumzeit-url

# Note: Wrap passwords with special characters (like #) in quotes
```

### 2. Build and Run

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

## Using with Portainer

### Option 1: Deploy from Git Repository

1. In Portainer, go to **Stacks** → **Add Stack**
2. Choose **Repository**
3. Enter the repository URL and path to `backend/docker-compose.yml`
4. Add environment variables in the Portainer UI
5. Click **Deploy the stack**

### Option 2: Deploy with docker-compose.yml

1. In Portainer, go to **Stacks** → **Add Stack**
2. Choose **Web editor**
3. Copy the contents of `docker-compose.yml`
4. Add environment variables in the **Environment variables** section:
   - `NEXTCLOUD_URL`
   - `NEXTCLOUD_ADMIN_USER`
   - `NEXTCLOUD_ADMIN_PASSWORD`
   - `NEXTCLOUD_DEFAULT_GROUP`
   - `RAUMZEIT_URL`
5. Click **Deploy the stack**

## Manual Docker Commands

```bash
# Build the image
docker build -t nextcloud-register-backend .

# Run the container
docker run -d \
  --name nextcloud-register-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXTCLOUD_URL=https://your-nextcloud-url \
  -e NEXTCLOUD_ADMIN_USER=admin \
  -e NEXTCLOUD_ADMIN_PASSWORD="your#password" \
  -e NEXTCLOUD_DEFAULT_GROUP=IWI \
  -e RAUMZEIT_URL=https://raumzeit-url \
  -v $(pwd)/logs:/app/logs \
  nextcloud-register-backend

# View logs
docker logs -f nextcloud-register-backend

# Stop and remove
docker stop nextcloud-register-backend
docker rm nextcloud-register-backend
```

## Health Check

The container includes a health check endpoint:
- URL: `http://localhost:3000/health`
- Runs every 30 seconds
- View health status: `docker inspect --format='{{.State.Health.Status}}' nextcloud-register-backend`

## Logs

Logs are persisted in the `./logs` directory and mounted as a volume.

## Port Configuration

By default, the service runs on port 3000. To change the port mapping:

```yaml
ports:
  - "8080:3000"  # Maps host port 8080 to container port 3000
```

## Network

The service creates a bridge network `nextcloud-register-network` for isolated container communication.

## Troubleshooting

### Check container status
```bash
docker-compose ps
```

### View real-time logs
```bash
docker-compose logs -f
```

### Restart the service
```bash
docker-compose restart
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

### Enter container shell
```bash
docker-compose exec nextcloud-register-backend sh
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `production` | Node environment |
| `PORT` | No | `3000` | Server port |
| `NEXTCLOUD_URL` | Yes | - | Nextcloud instance URL |
| `NEXTCLOUD_ADMIN_USER` | Yes | - | Nextcloud admin username |
| `NEXTCLOUD_ADMIN_PASSWORD` | Yes | - | Nextcloud admin password |
| `NEXTCLOUD_DEFAULT_GROUP` | No | `IWI` | Default group for new users |
| `RAUMZEIT_URL` | Yes | - | Raumzeit API URL |

## Security Notes

- Never commit `.env` file to Git
- Use strong passwords
- Consider using Docker secrets for sensitive data in production
- Ensure proper network isolation in production environments
