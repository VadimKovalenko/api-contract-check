#!/usr/bin/env bash
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl git gnupg nginx

install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list

apt-get update
apt-get install -y nodejs

id app || useradd --system --create-home --home-dir /opt/api-contract-check --shell /usr/sbin/nologin app
install -d -o app -g app -m 0755 /opt/api-contract-check/current

cat >/etc/nginx/sites-available/api-contract-check <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /opt/api-contract-check/current/dist;
    index index.html;

    access_log /var/log/nginx/api-contract-check.access.log;
    error_log /var/log/nginx/api-contract-check.error.log warn;

    client_max_body_size 2m;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy no-referrer always;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 35s;
        proxy_send_timeout 35s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/api-contract-check /etc/nginx/sites-enabled/api-contract-check
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx

cat >/etc/systemd/system/api-contract-check.service <<'SERVICE'
[Unit]
Description=API Schema Coverage Dashboard
After=network.target

[Service]
Type=simple
User=app
Group=app
WorkingDirectory=/opt/api-contract-check/current
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
