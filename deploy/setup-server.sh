#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 server.
# Installs Java, PostgreSQL and Caddy (web server with automatic HTTPS), and creates the app's service.
#
# Usage: sudo DOMAIN=your.domain.com bash setup-server.sh
set -euo pipefail

: "${DOMAIN:?Set DOMAIN to the web address of the server}"

APP_DIR=/opt/chicago-sky-tracker
CONFIG_DIR=/etc/chicago-sky-tracker

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl gnupg ca-certificates unattended-upgrades

# Security updates install automatically.
dpkg-reconfigure -f noninteractive unattended-upgrades

# Swap space, since small servers only have 1 GB of memory.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Java 25 (Eclipse Temurin)
curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /usr/share/keyrings/adoptium.gpg
echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb $(. /etc/os-release && echo "$VERSION_CODENAME") main" \
  > /etc/apt/sources.list.d/adoptium.list

# PostgreSQL 17 from the official Postgres repository
apt-get install -y postgresql-common
/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y

# Caddy
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list

apt-get update
apt-get install -y temurin-25-jdk postgresql-17 caddy

# Database and a dedicated database user with a random password
DB_PASSWORD=$(openssl rand -hex 24)
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'skytracker'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE USER skytracker WITH PASSWORD '$DB_PASSWORD'"
  sudo -u postgres createdb -O skytracker flight_tracker
  # earthdistance needs superuser to install, so add it here instead of in the app's migration.
  sudo -u postgres psql -d flight_tracker -c "CREATE EXTENSION IF NOT EXISTS cube; CREATE EXTENSION IF NOT EXISTS earthdistance;"
  WRITE_CONFIG=1
fi

# App user, folders and settings
id skytracker >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin skytracker
mkdir -p "$APP_DIR" "$CONFIG_DIR"
chown skytracker:skytracker "$APP_DIR"

if [ "${WRITE_CONFIG:-0}" = 1 ]; then
  cat > "$CONFIG_DIR/app.env" <<EOF
DB_USER=skytracker
DB_PASSWORD=$DB_PASSWORD
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
OPENSKY_POLL_INTERVAL=PT30S
EOF
fi
chmod 600 "$CONFIG_DIR/app.env"

# Service that starts the app on boot and restarts it if it crashes
cp "$(dirname "$0")/chicago-sky-tracker.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable chicago-sky-tracker

# HTTPS in front of the app
sed "s/{\$DOMAIN}/$DOMAIN/" "$(dirname "$0")/Caddyfile" > /etc/caddy/Caddyfile
systemctl reload caddy

echo "Setup done. Add OpenSky credentials to $CONFIG_DIR/app.env, then deploy the app."
