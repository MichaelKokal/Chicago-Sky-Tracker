# Deployment

The whole app runs on one small Ubuntu server:

```
Visitor ──HTTPS──► Caddy ──► Spring Boot (serves the website and /api) ──► PostgreSQL
```

- **Caddy** handles HTTPS and gets a free certificate from Let's Encrypt automatically.
- **Spring Boot** runs as a system service (`chicago-sky-tracker`) that starts on boot and restarts if it crashes.
- **GitHub Actions** (`.github/workflows/deploy.yml`) runs the tests on every push. On `main`, it builds the website into the
  Java app, copies it to the server and restarts the service, then checks that the site came back up.

## Setting up a new server

1. Create an Ubuntu 24.04 server with ports 22, 80 and 443 open, and point a domain name at it.
2. Copy this folder to the server and run:
   ```
   sudo DOMAIN=your.domain.com bash setup-server.sh
   ```
3. Add the OpenSky API credentials to `/etc/chicago-sky-tracker/app.env`.
4. In the GitHub repo settings, add:
   - Variables: `DEPLOY_HOST` (server address), `DEPLOY_USER` (SSH user), `DEPLOY_PUBLIC_URL` (e.g. `https://your.domain.com`)
   - Secret: `DEPLOY_SSH_KEY` (a private key that can log in as `DEPLOY_USER`)
5. Push to `main` (or run the workflow by hand) to deploy.

## Useful commands on the server

```
sudo systemctl status chicago-sky-tracker     # is it running?
sudo journalctl -u chicago-sky-tracker -f     # live logs
sudo -u postgres psql flight_tracker          # database shell
```
