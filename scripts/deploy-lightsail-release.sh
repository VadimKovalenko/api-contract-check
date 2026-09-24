#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/api-contract-check"
APP_USER="app"
SERVICE_NAME="api-contract-check"
RELEASE_VERSION="${RELEASE_VERSION:?RELEASE_VERSION is required}"
ARTIFACT="/tmp/api-contract-check-${RELEASE_VERSION}.tar.gz"
RELEASES_DIR="${APP_DIR}/releases"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_VERSION}"

if [ ! -f "${ARTIFACT}" ]; then
  echo "Missing release artifact: ${ARTIFACT}" >&2
  exit 1
fi

sudo install -d -o "${APP_USER}" -g "${APP_USER}" -m 0755 "${RELEASES_DIR}"
sudo rm -rf "${RELEASE_DIR}"
sudo install -d -o "${APP_USER}" -g "${APP_USER}" -m 0755 "${RELEASE_DIR}"
sudo tar -xzf "${ARTIFACT}" -C "${RELEASE_DIR}"
sudo chown -R "${APP_USER}:${APP_USER}" "${RELEASE_DIR}"

cd "${RELEASE_DIR}"
sudo -u "${APP_USER}" npm ci --omit=dev

if [ -e "${APP_DIR}/current" ] && [ ! -L "${APP_DIR}/current" ]; then
  sudo mv "${APP_DIR}/current" "${RELEASES_DIR}/previous-manual-$(date -u +%Y%m%d%H%M%S)"
fi

sudo ln -sfn "${RELEASE_DIR}" "${APP_DIR}/current"
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl reload nginx

curl -fsS http://127.0.0.1/ >/dev/null
