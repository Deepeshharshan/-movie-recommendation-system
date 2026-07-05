# =============================================================================
# VISIONCINE — main.tf
# Core AWS infrastructure: VPC, Subnet, IGW, Route Table, Security Group, EC2
# =============================================================================

# ─── 1. VPC ──────────────────────────────────────────────────────────────────
# The Virtual Private Cloud is the isolated network boundary for all resources.
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# ─── 2. Internet Gateway ─────────────────────────────────────────────────────
# Allows resources in the public subnet to reach the internet.
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# ─── 3. Public Subnet ────────────────────────────────────────────────────────
# Instances launched here will automatically receive a public IP.
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

# ─── 4. Route Table ──────────────────────────────────────────────────────────
# Routes all outbound traffic (0.0.0.0/0) through the Internet Gateway.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# ─── 5. Route Table Association ──────────────────────────────────────────────
# Links the public route table to the public subnet.
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ─── 6. Security Group ───────────────────────────────────────────────────────
# Defines inbound/outbound firewall rules for the EC2 instance.
resource "aws_security_group" "ec2_sg" {
  name        = "${var.project_name}-ec2-sg"
  description = "Allow SSH, HTTP, HTTPS and app traffic"
  vpc_id      = aws_vpc.main.id

  # SSH — restrict to your IP in production
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # VisionCine application port
  ingress {
    description = "VisionCine App"
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ec2-sg"
  }
}

# ─── 7. SSH Key Pair ─────────────────────────────────────────────────────────
# Generates a new RSA key pair and uploads the public key to AWS.
resource "tls_private_key" "ec2_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ec2_key" {
  key_name   = var.key_pair_name
  public_key = tls_private_key.ec2_key.public_key_openssh

  tags = {
    Name = "${var.project_name}-keypair"
  }
}

# Save the private key locally (git-ignored)
resource "local_file" "private_key" {
  content         = tls_private_key.ec2_key.private_key_pem
  filename        = "${path.module}/${var.key_pair_name}.pem"
  file_permission = "0400"
}

# ─── 8. EC2 Instance ─────────────────────────────────────────────────────────
# Ubuntu 22.04 LTS — t2.micro is free-tier eligible.
resource "aws_instance" "web_server" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  key_name               = aws_key_pair.ec2_key.key_name

  # User data script: installs Docker on first boot
  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y docker.io
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ubuntu
    echo "VisionCine EC2 Instance Ready" > /home/ubuntu/READY.txt
  EOF

  tags = {
    Name = "${var.project_name}-ec2"
  }
}

# ─── 9. Elastic IP ───────────────────────────────────────────────────────────
# Provides a static public IP address that persists across instance restarts.
resource "aws_eip" "web_eip" {
  instance = aws_instance.web_server.id
  domain   = "vpc"

  depends_on = [aws_internet_gateway.igw]

  tags = {
    Name = "${var.project_name}-eip"
  }
}
