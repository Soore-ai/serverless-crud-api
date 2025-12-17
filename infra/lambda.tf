resource "aws_iam_role" "lambda_role" {
  name = "crud-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "crud-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:*"]
        Resource = aws_dynamodb_table.items_table.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "crud_lambda" {
  function_name = var.lambda_function_name
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs18.x"
  handler       = "index.handler"

  filename         = "${path.module}/../lambda/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda/lambda.zip")

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}
