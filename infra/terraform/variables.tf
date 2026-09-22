variable "aws_region" {
  description = "AWS region for Lightsail and Route 53 API calls."
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Name prefix used for provisioned resources."
  type        = string
  default     = "api-contract-check"
}

variable "availability_zone" {
  description = "Lightsail availability zone, for example us-east-1a."
  type        = string
  default     = "us-east-1a"
}

variable "blueprint_id" {
  description = "Lightsail OS image."
  type        = string
  default     = "ubuntu_24_04"
}

variable "bundle_id" {
  description = "Lightsail instance size."
  type        = string
  default     = "nano_3_0"
}

variable "ssh_key_pair_name" {
  description = "Existing Lightsail key pair name for SSH access."
  type        = string
}

variable "ssh_cidrs" {
  description = "IPv4 CIDR ranges allowed to SSH into the instance."
  type        = list(string)
}

variable "domain_name" {
  description = "Fully qualified domain name for the app, for example api-check.example.com."
  type        = string
}

variable "route53_zone_name" {
  description = "Existing Route 53 hosted zone name, for example example.com."
  type        = string
}

variable "create_www_record" {
  description = "Whether to also create a www CNAME pointing at domain_name."
  type        = bool
  default     = false
}
