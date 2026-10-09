# Running with Docker

This project now ships with a production-style Docker setup: three
containers (MongoDB, backend API, frontend) wired together with
`docker-compose.yml`, on their own isolated network, with health checks
and no dependency on MongoDB Atlas.

```
┌─────────────┐      /api/*      ┌─────────────┐        ┌─────────────┐
│  frontend    │ ───────────────▶│  backend     │──────▶│  mongo       │
│  (Nginx :80) │                 │  (Node :5000)│        │  (Mongo :27017)│
└─────────────┘                 └─────────────┘        └─────────────┘
     ▲ :3000 (host)
```

- **frontend**: multi-stage build — Vite compiles the React app, then an
  Nginx image serves the static files and reverse-proxies `/api/*` to the
  backend container. This is why no `VITE_API_URL` is needed in production.
- **backend**: multi-stage build — TypeScript is compiled in a `builder`
  stage; the final image only contains `dist/` and production
  dependencies, and runs as a non-root user.
- **uploads**: file attachments are stored in a named volume (`uploads_data`) mounted at `/app/uploads`, and served through Nginx at `/uploads`.
- **mongo**: the official MongoDB image. An init script
  (`docker/mongo-init/init-mongo.sh`) runs once, on first boot, to create
  an application-scoped database user with `readWrite` on just the
  `todo-app` database — the backend never uses the root credentials.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose) installed and running.

## 1. Configure environment variables

From the project root:

```bash
cp .env.example .env
```

Open `.env` and change at least:
- `MONGO_ROOT_PASSWORD`
- `MONGO_APP_PASSWORD`
- `JWT_SECRET` (e.g. generate one with `openssl rand -base64 48`)

Email variables are optional — leave them blank if you don't need
password-reset emails.

## 2. Build and start everything

```bash
docker compose up --build
```

First run takes a few minutes (downloading base images, installing
dependencies, compiling). Subsequent runs are much faster thanks to
Docker's layer cache.

To run in the background instead:
```bash
docker compose up --build -d
```

## 3. Open the app

- Frontend: http://localhost:3000
- Swagger API docs: http://localhost:3000/api/docs
- Backend health check: `docker compose exec backend wget -qO- localhost:5000/api/health`
  (port 5000 is not published to the host — see note below)

## Useful commands

| Purpose | Command |
|---|---|
| View logs (all services) | `docker compose logs -f` |
| View logs (one service) | `docker compose logs -f backend` |
| Stop everything | `docker compose down` |
| Stop and delete DB data too | `docker compose down -v` |
| Rebuild after code changes | `docker compose up --build` |
| Check container health | `docker compose ps` |

## Notes on the setup

- **Mongo's data persists** in a named Docker volume (`mongo_data`), so
  your todos survive `docker compose down` (but not `down -v`).
- **The backend port (5000) is not published to the host** in
  `docker-compose.yml` (`expose`, not `ports`) — only the frontend
  (Nginx) is reachable from your machine, and it proxies API calls
  internally over the Docker network. This mirrors how you'd deploy
  behind a real reverse proxy/load balancer.
- **Mongo's port (27017) *is* published** to the host for convenience
  (so you can connect with MongoDB Compass or `mongosh` while
  developing). Remove that `ports:` block in `docker-compose.yml` for a
  real production deployment.
- Both Dockerfiles use **multi-stage builds** so the final images don't
  contain source TypeScript, dev dependencies, or build tools — only
  what's needed to run.
- The backend container runs as a **non-root user** and has a
  **HEALTHCHECK** hitting `/api/health`, which `docker compose ps` and
  orchestrators (Swarm/Kubernetes) can use to detect a broken instance.

## Switching back to MongoDB Atlas instead of the mongo container

If you'd rather keep using Atlas (as in the original setup) but still
containerize the app: delete the `mongo` service from
`docker-compose.yml`, remove `depends_on: mongo` from `backend`, and set
`MONGODB_URI` directly to your Atlas connection string in `.env`
(replacing the whole `MONGODB_URI:` line under `backend.environment` in
`docker-compose.yml` with `MONGODB_URI: ${MONGODB_URI}`).

## Password-reset emails in Docker

The containers run with `NODE_ENV=production`, so the on-screen dev reset link is disabled. To use *Forgot password*, fill the `EMAIL_*` variables in `.env` (e.g. a Gmail app password).
