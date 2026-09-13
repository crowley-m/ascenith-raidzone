# CI image builds + auto-deploy

**Status: live.** `.github/workflows/build.yml` builds
`ghcr.io/crowley-m/ascenith-raidzone:latest` on every push to `main`, then
SSHes into the VPS and runs `./deploy.sh`, which pulls the image and restarts
— no local build, no manual archive/scp. Cut over 2026-09-13.

## How it works

1. Push to `main` (or `workflow_dispatch` on the Actions tab).
2. GitHub builds the image, pushes to GHCR.
3. `deploy` job SSHes into the VPS (`VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY` repo
   secrets, gated on the `DEPLOY_ENABLED` repo variable) and runs
   `cd /opt/ascenith && ./deploy.sh`.
4. `deploy.sh` does `docker compose --profile app pull` +
   `docker compose --profile app up -d` — web still runs
   `prisma migrate deploy` + seed on boot, same as always.

Manual deploy still works exactly the same way: SSH in and
`cd /opt/ascenith && ./deploy.sh`.

## VPS pull access

The GHCR package is **private** (it's the whole `src/` tree — RBAC, server
actions, staff-mask logic — not a public-facing bundle). The box authenticates
with a **classic** PAT, `read:packages` scope only — fine-grained tokens don't
support GHCR package pulls. `docker login ghcr.io` ran once on the box;
credentials live in `/root/.docker/config.json`, not in the repo. Rotate by
generating a new classic PAT and re-running the login — GitHub → avatar →
Settings → Developer settings → Personal access tokens → Tokens (classic).

## Rollback

- **Stop auto-deploy without touching code**: flip the `DEPLOY_ENABLED` repo
  variable to anything but `true`.
- **Revert the VPS to building locally**: `docker-compose.yml.bak` and
  `deploy.sh.bak` in `/opt/ascenith/` are the pre-cutover versions — copy them
  back over the current files, or `docker compose up -d --build` directly.
