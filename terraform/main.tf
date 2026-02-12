terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# DynamoDB Table with Single-Table Design
resource "aws_dynamodb_table" "engineering_tasks" {
  name           = "engineering-tasks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "assignee"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "priority"
    type = "S"
  }

  attribute {
    name = "dueDate"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # GSI1 - Assignee Index
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "assignee"
    range_key       = "dueDate"
    projection_type = "ALL"
  }

  # GSI2 - Status Index
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # GSI3 - Priority Index
  global_secondary_index {
    name            = "GSI3"
    hash_key        = "priority"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = {
    Name        = "engineering-tasks"
    Environment = var.environment
  }
}
