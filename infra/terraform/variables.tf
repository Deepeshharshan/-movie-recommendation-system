# =============================================================================
# VISIONCINE — variables.tf
# All input variables with descriptions and defaults
# =============================================================================

variable "aws_region" {
  description = "AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment label (dev / staging / prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Short project name used as a prefix on resource names"
  type        = string
  default     = "visioncine"
}

# ── Network ─────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "Availability zone for the public subnet"
  type        = string
  default     = "us-east-1a"
}

# ── EC2 ──────────────────────────────────────────────────────────────────────

variable "ami_id" {
  description = "AMI ID for the EC2 instance (Ubuntu 22.04 LTS in us-east-1)"
  type        = string
  default     = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS — us-east-1
}

variable "instance_type" {
  description = "EC2 instance type (t2.micro is free-tier eligible)"
  type        = string
  default     = "t2.micro"
}

variable "key_pair_name" {
  description = "Name of the EC2 Key Pair to allow SSH access (must already exist in AWS)"
  type        = string
  default     = "visioncine-key"
}

# ── Security ─────────────────────────────────────────────────────────────────

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into the EC2 instance (use your own IP in production)"
  type        = string
  default     = "0.0.0.0/0" # ⚠️ Restrict to your IP in production
}

variable "app_port" {
  description = "Application port to open on the security group"
  type        = number
  default     = 5002
}
