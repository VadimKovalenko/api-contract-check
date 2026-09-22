output "lightsail_instance_name" {
  description = "Lightsail instance name."
  value       = aws_lightsail_instance.app.name
}

output "static_ip_address" {
  description = "Static public IPv4 address attached to the instance."
  value       = aws_lightsail_static_ip.app.ip_address
}

output "app_url" {
  description = "HTTP URL for the app. Add TLS before using production traffic."
  value       = "http://${var.domain_name}"
}

output "ssh_command" {
  description = "SSH command for the default Ubuntu Lightsail user."
  value       = "ssh ubuntu@${aws_lightsail_static_ip.app.ip_address}"
}
