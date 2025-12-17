variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = "crud-items-table"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "crud-lambda"
}
