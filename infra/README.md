# Production Infrastructure

This directory contains a first production-oriented deployment baseline for running the app on Amazon Lightsail behind nginx.

## Layout

```text
infra/
  nginx/       nginx site config for serving dist/ and proxying /api
  systemd/     systemd service for the Node API
  terraform/   Lightsail, static IP, firewall, and Route 53 records
```

## AWS Assumptions

- The domain is registered in Route 53.
- A public hosted zone already exists for `route53_zone_name`.
- A Lightsail SSH key pair already exists in the target region.
- Terraform is run by an AWS principal with Lightsail and Route 53 permissions.

## Provision

```sh
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

- `route53_zone_name`: apex hosted zone, for example `example.com`
- `domain_name`: app host, for example `api-check.example.com`
- `ssh_key_pair_name`: existing Lightsail key pair
- `ssh_cidrs`: your admin IP range, preferably a single `/32`
- `availability_zone`: a Lightsail-supported zone in `aws_region`

Then run:

```sh
terraform init
terraform plan
terraform apply
```

Terraform creates:

- Lightsail Ubuntu instance
- Static public IP attached to the instance
- Public ports for SSH, HTTP, and HTTPS
- Route 53 `A` record pointing the app domain at the static IP
- Optional `www` CNAME when `create_www_record = true`

The instance bootstrap installs Node.js 20, nginx, creates an `app` user, writes the nginx/systemd configs, and enables nginx. The app service is installed but will not become healthy until application code is deployed into `/opt/api-contract-check/current`.

## Deploy App Code

One simple first deployment path:

```sh
npm ci
npm run build
rsync -av --delete \
  --exclude node_modules \
  --exclude .git \
  ./ ubuntu@APP_IP:/tmp/api-contract-check/
ssh ubuntu@APP_IP
sudo rsync -av --delete /tmp/api-contract-check/ /opt/api-contract-check/current/
sudo chown -R app:app /opt/api-contract-check/current
cd /opt/api-contract-check/current
sudo -u app npm ci --omit=dev
sudo -u app npm run build
sudo systemctl enable --now api-contract-check
sudo systemctl restart api-contract-check nginx
```

## TLS

Port 443 is opened for TLS, but certificates are not automated yet. Add Certbot or an ACM-backed load balancer/distribution before sending real production traffic over credentials or sensitive payloads.
