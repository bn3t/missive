terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# ── Variables ──────────────────────────────────────────────────────────────────

variable "sender_email" {
  description = "The email address to verify in SES (e.g. noreply@yourdomain.com)"
  type        = string
}

variable "iam_user_name" {
  description = "Name of the IAM user that will be used to send emails via SES"
  type        = string
  default     = "missive-ses-sender"
}

# ── SES Email Identity ─────────────────────────────────────────────────────────

resource "aws_sesv2_email_identity" "sender" {
  email_identity = var.sender_email

  tags = {
    Project     = "missive"
    Environment = "test"
  }
}

# ── IAM User for SES sending ───────────────────────────────────────────────────

resource "aws_iam_user" "ses_sender" {
  name = var.iam_user_name

  tags = {
    Project     = "missive"
    Environment = "test"
  }
}

resource "aws_iam_user_policy" "ses_send_policy" {
  name = "ses-send-email-policy"
  user = aws_iam_user.ses_sender.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSESSendEmail"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.sender_email
          }
        }
      }
    ]
  })
}

resource "aws_iam_access_key" "ses_sender_key" {
  user = aws_iam_user.ses_sender.name
}

# ── Outputs ────────────────────────────────────────────────────────────────────

output "ses_identity_arn" {
  description = "ARN of the verified SES email identity"
  value       = aws_sesv2_email_identity.sender.arn
}

output "aws_access_key_id" {
  description = "AWS_ACCESS_KEY_ID for your .env"
  value       = aws_iam_access_key.ses_sender_key.id
  sensitive   = false
}

output "aws_secret_access_key" {
  description = "AWS_SECRET_ACCESS_KEY for your .env — treat as a secret!"
  value       = aws_iam_access_key.ses_sender_key.secret
  sensitive   = true
}

output "aws_region" {
  value = "us-east-1"
}
