# =============================================================================
# VISIONCINE — providers.tf
# AWS provider configuration
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "VisionCine"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
