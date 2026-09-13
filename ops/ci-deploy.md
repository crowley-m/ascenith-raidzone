# CI image builds + auto-deploy — server cutover

`.github/workflows/build.yml` builds `ghcr.io/crowley-m/ascenith-raidzone:latest`
on every push to `main`, then (once enabled below) SSHes into the VPS to pull
and restart. Until the steps below are done, the `deploy` job is skipped —
the workflow only publishes a spare image, and the VPS still builds locally
via `deploy.sh` exactly as it does tonight.

Steps 1–2 need your GitHub account (nothing I can do from here). Step 3 is
VPS config I can apply once 1–2 are done — ping me and I'll run it.

## 1. Give the VPS pull access to the (private) GHCR image

Keep the package private — it's the whole `src/` tree (RBAC, server actions,
staff-mask logic), not just a public-facing bundle, so don't flip it public.
Instead, generate a token scoped to read-only:

1. GitHub → your avatar → Settings → Developer settings → Personal access
   tokens → **Fine-grained tokens** → Generate new token.
2. Resource owner: `crowley-m`. Repository access: only
   `ascenith-raidzone`. Permissions: **Packages → Read-only**. Expiration:
   whatever you're comfortable rotating.
3. On the VPS (I can run this once you hand me the token, or run it
   yourself):
   ```
   echo '<token>' | docker login ghcr.io -u crowley-m --password-stdin
   ```
   This writes to `~/.docker/config.json` on the box — a one-time login, not
   stored in the repo.

## 2. Add repo secrets for the deploy step

GitHub → repo → Settings → Secrets and variables → Actions → **New repository
secret**, three of them:

| Name | Value |
|---|---|
| `VPS_HOST` | `147.189.172.101` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | contents of `~/.ssh/ascenith-deploy` (the private key) |

Then Settings → Secrets and variables → Actions → **Variables** tab → new
repo variable `DEPLOY_ENABLED` = `true`. The workflow checks this before
attempting SSH, so nothing tries to deploy — and nothing fails loudly for
missing secrets — until you flip it on.

Rotating later: this key already only does deploy-user things on one box
(see `ascenith-vps` notes) — if you ever want to shrink blast radius further,
a second keypair used only by CI (separate from your own `sshv.sh`/`scpv.sh`)
is a reasonable follow-up, not required to turn this on.

## 3. VPS-side cutover (I run this once 1–2 are done)

In `/opt/ascenith/docker-compose.yml`, for the `web` and `bot` services,
replace

```yaml
build:
  context: ./repo
  # ...
```

with

```yaml
image: ghcr.io/crowley-m/ascenith-raidzone:latest
pull_policy: always
```

And replace the build step in `/opt/ascenith/deploy.sh` with:

```bash
echo "==> Pulling image"
docker compose --profile app pull
echo "==> Starting stack"
docker compose --profile app up -d
docker builder prune -f
```

(`nice`/`ionice` no longer matter — there's nothing CPU-heavy left to run.)

## After cutover

Push to `main` → Action builds, pushes, SSHes in, restarts. ~1–2 min total,
no local build, no SSH-drop risk. Manual runs still work: `workflow_dispatch`
on the Actions tab, or `cd /opt/ascenith && ./deploy.sh` on the box.

## Rollback

Flip `DEPLOY_ENABLED` back to anything but `true` to stop auto-deploy without
touching code. For the VPS itself: `git revert` the compose change, or just
`docker compose up -d --build` as before — `deploy.sh.bak` on the box is the
pre-cutover version.
