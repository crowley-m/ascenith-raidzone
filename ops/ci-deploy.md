# CI image builds — server cutover

`.github/workflows/build.yml` builds `ghcr.io/crowley-m/ascenith-raidzone:latest`
on every push to `main`. Until the server is switched over it's just a spare
image — the VPS still builds locally via `deploy.sh` (now `nice`/`ionice`'d so it
no longer starves sshd).

## One-time cutover on the VPS

1. **Make the package pullable.** On the first successful workflow run the image
   is published to GHCR as **private**. Either:
   - make it public: GitHub → repo → Packages → `ascenith-raidzone` → Package
     settings → Change visibility → Public; or
   - keep it private and give the box a token: create a classic PAT with
     `read:packages`, then on the VPS
     `echo <PAT> | docker login ghcr.io -u crowley-m --password-stdin`.

2. **Point compose at the image.** In `/opt/ascenith/docker-compose.yml`, for the
   `web` and `bot` services replace

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

3. **Swap the deploy script.** Replace the build step in `/opt/ascenith/deploy.sh`
   with a pull:

   ```bash
   echo "==> Pulling image"
   docker compose --profile app pull
   echo "==> Starting stack"
   docker compose --profile app up -d
   ```

   The repo tar no longer needs to be shipped — but keep shipping it if you want
   `prisma/` migrations/seed on disk to match (the container already carries
   them, so this is optional).

4. **Deploy becomes:** push to `main` → wait for the Action → on the box
   `cd /opt/ascenith && ./deploy.sh`. ~10 s of work on the VPS, no build.

## Rollback

`git revert` the compose change, or `docker compose up -d --build` as before.
`deploy.sh.bak` on the box is the pre-`nice` version.
