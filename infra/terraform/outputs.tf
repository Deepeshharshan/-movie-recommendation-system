# =============================================================================
# VISIONCINE — outputs.tf
# Useful values printed after a successful terraform apply
# =============================================================================

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "ID of the EC2 security group"
  value       = aws_security_group.ec2_sg.id
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.web_server.id
}

output "instance_public_ip" {
  description = "Elastic IP (static public IP) of the EC2 instance"
  value       = aws_eip.web_eip.public_ip
}

output "instance_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.web_server.public_dns
}

output "ssh_command" {
  description = "SSH command to connect to the EC2 instance"
  value       = "ssh -i ${var.key_pair_name}.pem ubuntu@${aws_eip.web_eip.public_ip}"
}

output "app_url" {
  description = "VisionCine application URL"
  value       = "http://${aws_eip.web_eip.public_ip}:${var.app_port}"
}
