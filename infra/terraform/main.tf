provider "aws" {
  region = var.aws_region
}

locals {
  tags = {
    Application = var.app_name
    ManagedBy   = "terraform"
  }
}

data "aws_route53_zone" "app" {
  name         = trimsuffix(var.route53_zone_name, ".")
  private_zone = false
}

resource "aws_lightsail_static_ip" "app" {
  name = "${var.app_name}-ip"
}

resource "aws_lightsail_instance" "app" {
  name              = var.app_name
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  key_pair_name     = var.ssh_key_pair_name
  user_data         = file("${path.module}/user-data.sh")
  tags              = local.tags

  add_on {
    type          = "AutoSnapshot"
    snapshot_time = "04:00"
    status        = "Enabled"
  }
}

resource "aws_lightsail_static_ip_attachment" "app" {
  static_ip_name = aws_lightsail_static_ip.app.name
  instance_name  = aws_lightsail_instance.app.name
}

resource "aws_lightsail_instance_public_ports" "app" {
  instance_name = aws_lightsail_instance.app.name

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = var.ssh_cidrs
  }

  port_info {
    protocol   = "tcp"
    from_port  = 80
    to_port    = 80
    cidrs      = ["0.0.0.0/0"]
    ipv6_cidrs = ["::/0"]
  }

  port_info {
    protocol   = "tcp"
    from_port  = 443
    to_port    = 443
    cidrs      = ["0.0.0.0/0"]
    ipv6_cidrs = ["::/0"]
  }
}

resource "aws_route53_record" "app_a" {
  zone_id = data.aws_route53_zone.app.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_lightsail_static_ip.app.ip_address]
}

resource "aws_route53_record" "www" {
  count   = var.create_www_record ? 1 : 0
  zone_id = data.aws_route53_zone.app.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}
