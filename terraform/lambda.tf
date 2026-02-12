# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_role" {
  name = "engineering-task-api-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for DynamoDB Access
resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "lambda-dynamodb-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.engineering_tasks.arn,
          "${aws_dynamodb_table.engineering_tasks.arn}/index/*"
        ]
      }
    ]
  })
}

# CloudWatch Logs Policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda Layer for shared code
resource "aws_lambda_layer_version" "shared_layer" {
  filename            = "lambda-layer.zip"
  layer_name          = "engineering-task-api-shared"
  compatible_runtimes = [var.lambda_runtime]
  source_code_hash    = fileexists("lambda-layer.zip") ? filebase64sha256("lambda-layer.zip") : null

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Create Task Lambda
resource "aws_lambda_function" "create_task" {
  filename         = "lambda-functions.zip"
  function_name    = "engineering-task-api-create"
  role            = aws_iam_role.lambda_role.arn
  handler         = "handlers/createTask.handler"
  runtime         = var.lambda_runtime
  source_code_hash = fileexists("lambda-functions.zip") ? filebase64sha256("lambda-functions.zip") : null
  timeout         = 30

  layers = [aws_lambda_layer_version.shared_layer.arn]

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.engineering_tasks.name
    }
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Get Task Lambda
resource "aws_lambda_function" "get_task" {
  filename         = "lambda-functions.zip"
  function_name    = "engineering-task-api-get"
  role            = aws_iam_role.lambda_role.arn
  handler         = "handlers/getTask.handler"
  runtime         = var.lambda_runtime
  source_code_hash = fileexists("lambda-functions.zip") ? filebase64sha256("lambda-functions.zip") : null
  timeout         = 30

  layers = [aws_lambda_layer_version.shared_layer.arn]

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.engineering_tasks.name
    }
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Update Task Lambda
resource "aws_lambda_function" "update_task" {
  filename         = "lambda-functions.zip"
  function_name    = "engineering-task-api-update"
  role            = aws_iam_role.lambda_role.arn
  handler         = "handlers/updateTask.handler"
  runtime         = var.lambda_runtime
  source_code_hash = fileexists("lambda-functions.zip") ? filebase64sha256("lambda-functions.zip") : null
  timeout         = 30

  layers = [aws_lambda_layer_version.shared_layer.arn]

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.engineering_tasks.name
    }
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Delete Task Lambda
resource "aws_lambda_function" "delete_task" {
  filename         = "lambda-functions.zip"
  function_name    = "engineering-task-api-delete"
  role            = aws_iam_role.lambda_role.arn
  handler         = "handlers/deleteTask.handler"
  runtime         = var.lambda_runtime
  source_code_hash = fileexists("lambda-functions.zip") ? filebase64sha256("lambda-functions.zip") : null
  timeout         = 30

  layers = [aws_lambda_layer_version.shared_layer.arn]

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.engineering_tasks.name
    }
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# List Tasks Lambda
resource "aws_lambda_function" "list_tasks" {
  filename         = "lambda-functions.zip"
  function_name    = "engineering-task-api-list"
  role            = aws_iam_role.lambda_role.arn
  handler         = "handlers/listTasks.handler"
  runtime         = var.lambda_runtime
  source_code_hash = fileexists("lambda-functions.zip") ? filebase64sha256("lambda-functions.zip") : null
  timeout         = 30

  layers = [aws_lambda_layer_version.shared_layer.arn]

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.engineering_tasks.name
    }
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}
