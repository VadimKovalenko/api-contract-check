#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/api-contract-check"
APP_USER="app"
SERVICE_NAME="api-contract-check"
RELEASE_VERSION="${RELEASE_VERSION:?RELEASE_VERSION is required}"
ARTIFACT="/tmp/api-contract-check-${RELEASE_VERSION}.tar.gz"
RELEASES_DIR="${APP_DIR}/releases"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_VERSION}"
HEALTH_CHECK_ATTEMPTS=10
APP_DOMAIN="api-checker.dev"
TLS_DIR="/etc/api-contract-check/tls"
TLS_CERT="${TLS_DIR}/fullchain.pem"
TLS_KEY="${TLS_DIR}/privkey.pem"
LE_CERT="/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem"
LE_KEY="/etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem"

wait_for_endpoint() {
  local endpoint="$1"

  for ((attempt = 1; attempt <= HEALTH_CHECK_ATTEMPTS; attempt += 1)); do
    if curl -fsS "${endpoint}" >/dev/null 2>&1; then
      return 0
    fi

    sleep 1
  done

  echo "Endpoint did not become healthy: ${endpoint}" >&2
  return 1
}

ensure_tls_certificate() {
  sudo install -d -o root -g root -m 0755 "${TLS_DIR}"

  if sudo test -f "${LE_CERT}" && sudo test -f "${LE_KEY}"; then
    sudo ln -sfn "${LE_CERT}" "${TLS_CERT}"
    sudo ln -sfn "${LE_KEY}" "${TLS_KEY}"
    return
  fi

  if sudo test -f "${TLS_CERT}" && sudo test -f "${TLS_KEY}"; then
    return
  fi

  sudo openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 3650 \
    -subj "/CN=${APP_DOMAIN}" \
    -keyout "${TLS_KEY}" \
    -out "${TLS_CERT}"
  sudo chmod 600 "${TLS_KEY}"
}

if [ ! -f "${ARTIFACT}" ]; then
  echo "Missing release artifact: ${ARTIFACT}" >&2
  exit 1
fi

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  sudo useradd --system --create-home --home-dir "${APP_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
fi

sudo install -d -o "${APP_USER}" -g "${APP_USER}" -m 0755 "${RELEASES_DIR}"
sudo rm -rf "${RELEASE_DIR}"
sudo install -d -o "${APP_USER}" -g "${APP_USER}" -m 0755 "${RELEASE_DIR}"
sudo tar -xzf "${ARTIFACT}" -C "${RELEASE_DIR}"
sudo chown -R "${APP_USER}:${APP_USER}" "${RELEASE_DIR}"

sudo -u "${APP_USER}" bash -c 'cd "$1" && npm ci --omit=dev' -- "${RELEASE_DIR}"

if sudo test -e "${APP_DIR}/current" && ! sudo test -L "${APP_DIR}/current"; then
  sudo mv "${APP_DIR}/current" "${RELEASES_DIR}/previous-manual-$(date -u +%Y%m%d%H%M%S)"
fi

sudo ln -sfn "${RELEASE_DIR}" "${APP_DIR}/current"
ensure_tls_certificate
sudo install -D -o root -g root -m 0644 \
  "${RELEASE_DIR}/infra/systemd/${SERVICE_NAME}.service" \
  "/etc/systemd/system/${SERVICE_NAME}.service"
sudo install -D -o root -g root -m 0644 \
  "${RELEASE_DIR}/infra/nginx/${SERVICE_NAME}.conf" \
  "/etc/nginx/sites-available/${SERVICE_NAME}"
sudo ln -sfn "/etc/nginx/sites-available/${SERVICE_NAME}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl reload nginx

wait_for_endpoint http://127.0.0.1/api/health
wait_for_endpoint http://127.0.0.1/
