# Docker Setup for React Regional Dashboard

This guide explains how to run the React Regional Dashboard using Docker Compose.

## 🐳 Quick Start

```bash
# From project root directory
cd /home/alamin/Desktop/Python\ Projects/BTRC-QoS-Monitoring-Dashboard-V3

# Start all services (including React dashboard)
docker compose up -d

# View logs
docker compose logs -f react-regional

# Access dashboard
# http://localhost:5173
```

## 📦 What Gets Started

Running `docker compose up -d` starts:
- **TimescaleDB** (port 5433) - Database
- **Metabase** (port 3000) - Data backend
- **Nginx** (port 9000) - Custom wrapper (optional)
- **React Regional** (port 5173) - React dashboard ✨ NEW
- **Metabase Init** - Auto-creates users (runs once)

## 🌐 Access URLs

After starting services:

| Service | URL | Description |
|---------|-----|-------------|
| React Dashboard | http://localhost:5173 | **Main dashboard** (React + ECharts + Leaflet) |
| Metabase | http://localhost:3000 | Metabase UI (data backend) |
| Nginx Wrapper | http://localhost:9000/dashboard | Custom HTML wrapper |
| TimescaleDB | localhost:5433 | PostgreSQL database |

## 🚀 Usage

### Start Services

```bash
# Start all services in background
docker compose up -d

# Or start specific services
docker compose up -d react-regional metabase timescaledb
```

### View Logs

```bash
# All services
docker compose logs -f

# React dashboard only
docker compose logs -f react-regional

# Last 50 lines
docker compose logs --tail=50 react-regional
```

### Stop Services

```bash
# Stop all services
docker compose down

# Stop specific service
docker compose stop react-regional
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart React only
docker compose restart react-regional
```

### Rebuild After Code Changes

```bash
# Rebuild React image
docker compose build react-regional

# Rebuild and restart
docker compose up -d --build react-regional
```

## 🔧 Configuration

### Environment Variables

The React app uses `.env.docker` file when running in Docker:

```bash
# btrc-react-regional/.env.docker
VITE_METABASE_URL=http://localhost:3000
VITE_METABASE_USERNAME=alamin.technometrics22@gmail.com
VITE_METABASE_PASSWORD=Test@123
```

**Important:** Even in Docker, use `localhost:3000` for Metabase URL because:
- React runs in browser (client-side)
- Browser accesses Metabase from host machine
- Docker network is only for container-to-container communication

### Hot Reload

The Docker setup supports hot reload:
- Edit files in `btrc-react-regional/src/`
- Changes auto-reload in browser
- No need to rebuild Docker image

### Port Conflicts

If port 5173 is in use:

```yaml
# In docker-compose.yml, change:
react-regional:
  ports:
    - "5174:5173"  # Map host 5174 to container 5173
```

Then access at: http://localhost:5174

## 📁 Docker Files

### Dockerfile
- Location: `btrc-react-regional/Dockerfile`
- Uses Node 22 Alpine
- Multi-stage: development + production
- Development mode: hot reload enabled

### .dockerignore
- Location: `btrc-react-regional/.dockerignore`
- Excludes: node_modules, dist, .git
- Reduces image size

### docker-compose.yml
- Service name: `react-regional`
- Container name: `btrc-v3-react-regional`
- Network: `btrc-v3`

## 🐛 Troubleshooting

### React Dashboard Not Loading

**Check if container is running:**
```bash
docker ps | grep react-regional
```

**Check logs:**
```bash
docker compose logs react-regional
```

**Restart container:**
```bash
docker compose restart react-regional
```

### Cannot Connect to Metabase

**Check Metabase is running:**
```bash
docker ps | grep metabase
curl http://localhost:3000/api/health
```

**Check network:**
```bash
docker network inspect btrc-qos-monitoring-dashboard-v3_btrc-v3
```

### Hot Reload Not Working

**Issue:** File changes not reflecting

**Solution 1:** Use polling (already configured in vite.config.js)
```javascript
// vite.config.js
server: {
  watch: {
    usePolling: true,
  },
}
```

**Solution 2:** Restart container
```bash
docker compose restart react-regional
```

### Port Already in Use

**Error:** `Port 5173 is already allocated`

**Solution:**
```bash
# Find process using port
lsof -i :5173

# Change port in docker-compose.yml
react-regional:
  ports:
    - "5174:5173"
```

### Build Errors

**Error:** `yarn install` fails

**Solution:** Rebuild with no cache
```bash
docker compose build --no-cache react-regional
```

### Node Version Warning

**Warning:** "You are using Node.js 22.5.1..."

**Impact:** None, app works fine
**Solution:** Ignore or upgrade Node in Dockerfile
```dockerfile
FROM node:22.12-alpine  # Use specific version
```

## 🔄 Development Workflow

### Making Changes

1. **Edit code** in `btrc-react-regional/src/`
2. **Save file** → Vite auto-reloads
3. **Check browser** → Changes appear
4. **No rebuild needed** (volumes mounted)

### Adding Dependencies

```bash
# Option 1: Install in container
docker compose exec react-regional yarn add package-name

# Option 2: Install locally then rebuild
cd btrc-react-regional
yarn add package-name
docker compose up -d --build react-regional
```

### Updating Environment Variables

1. Edit `.env.docker`
2. Restart container:
   ```bash
   docker compose restart react-regional
   ```

## 📊 Service Dependencies

```
react-regional
    ↓ depends_on
metabase (with healthcheck)
    ↓ depends_on
timescaledb (with healthcheck)
```

React dashboard waits for Metabase to be healthy before starting.

## 🚢 Production Deployment

For production, use the production stage:

```bash
# Build production image
docker compose -f docker-compose.prod.yml build react-regional

# Or manually
docker build -t btrc-react-regional:prod \
  --target production \
  ./btrc-react-regional
```

Production serves optimized static files via Nginx.

## 📈 Performance

### Development Mode (Docker)
- Initial startup: ~30 seconds
- Hot reload: < 1 second
- Memory usage: ~200 MB

### Production Mode (Docker)
- Initial startup: ~5 seconds
- Memory usage: ~50 MB (Nginx)

## 🆚 Docker vs Local

| Aspect | Local (npm/yarn) | Docker |
|--------|------------------|--------|
| **Setup** | Manual install | Automatic |
| **Portability** | ❌ Depends on Node version | ✅ Consistent |
| **Hot Reload** | ✅ Fast | ✅ Fast (polling) |
| **Resource Usage** | Lower | Slightly higher |
| **Isolation** | ❌ No | ✅ Yes |

## 📝 Commands Summary

```bash
# Start everything
docker compose up -d

# View React logs
docker compose logs -f react-regional

# Restart React
docker compose restart react-regional

# Rebuild React
docker compose up -d --build react-regional

# Stop everything
docker compose down

# Access dashboard
# http://localhost:5173
```

## ✅ Verification Checklist

After running `docker compose up -d`:

- [ ] Container is running: `docker ps | grep react-regional`
- [ ] No errors in logs: `docker compose logs react-regional`
- [ ] Dashboard loads: http://localhost:5173
- [ ] Auto-login works
- [ ] Maps display correctly
- [ ] Charts render
- [ ] Filters work
- [ ] Hot reload works (edit a file and check browser)

## 🎯 Next Steps

Once the Docker setup is verified:
1. Use the dashboard normally
2. Make code changes as needed (hot reload enabled)
3. Deploy to production using production Dockerfile stage

---

**✅ Docker setup complete! Run `docker compose up -d` to start.**
