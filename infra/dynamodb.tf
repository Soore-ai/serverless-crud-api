resource "aws_dynamodb_table" "items_table" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "id"
    type = "S"
  }

  hash_key = "id"
}
