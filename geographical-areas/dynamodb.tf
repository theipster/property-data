locals {
  ddb_areas_table_name = "${var.service}-${var.stage}-AreasTable-HWMHZXTRHY1O"
}

resource "aws_dynamodb_table" "areas" {
  name     = local.ddb_areas_table_name
  hash_key = "polyline"

  billing_mode     = "PAY_PER_REQUEST"
  stream_enabled   = true
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
  id = local.ddb_areas_table_name
}
