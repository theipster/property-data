resource "aws_dynamodb_table" "areas" {
  name     = "geographical-areas-dev-AreasTable-HWMHZXTRHY1O"
  hash_key = "polyline"

  billing_mode     = "PAY_PER_REQUEST"
  stream_view_type = "KEYS_ONLY"

  attribute {
    name = "polyline"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

import {
  to = aws_dynamodb_table.areas
  id = "geographical-areas-dev-AreasTable-HWMHZXTRHY1O"
}
