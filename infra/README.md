# Production Infrastructure

This directory contains a first production-oriented deployment baseline for running the app on Amazon Lightsail behind nginx.

## Layout

```text
infra/
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

Server bootstrap is managed separately from Terraform. The deployment workflow expects the
host to already provide Node.js 20, nginx, the `app` service account, and the
`api-contract-check` systemd unit.

## Deploy App Code

Release tags build and publish a deployable artifact through GitHub Actions.
Tags should use semantic versioning:

```sh
git tag v1.0.0
git push origin v1.0.0
```

The release workflow runs lint, tests, and build, then creates an archive with
the runtime files needed by the Lightsail host. Deployment is skipped until the
production environment is configured in GitHub.

To enable Lightsail deployment, create a GitHub environment named `production`
and add:

- Repository or environment variable `LIGHTSAIL_HOST`: the Lightsail public DNS
  name or static IP.
- Optional variable `LIGHTSAIL_USER`: SSH user, defaults to `ubuntu`.
- Environment secret `LIGHTSAIL_SSH_PRIVATE_KEY`: private key for the Lightsail
  SSH key pair.

When `LIGHTSAIL_HOST` is set, each `v*` tag copies the release archive to the
instance, extracts it under `/opt/api-contract-check/releases/<tag>`, installs
production dependencies, points `/opt/api-contract-check/current` at that
release, restarts the systemd service, reloads nginx, and checks the local nginx
response.

One manual deployment path, useful before GitHub Actions is connected:

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
