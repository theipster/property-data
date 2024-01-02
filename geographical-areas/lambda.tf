data "aws_s3_object" "notify_fn" {
  bucket = "geographical-areas-dev-serverlessdeploymentbucket-1gy0zx4raz83g"
  key    = "serverless/geographical-areas/dev/1675567473624-2023-02-05T03:24:33.624Z/geographical-areas.zip"
}

locals {
  lambda_fn_notify_name = "${var.service}-${var.stage}-notify"
}

resource "aws_lambda_event_source_mapping" "notify" {
  function_name = aws_lambda_function.notify.arn

  event_source_arn = aws_dynamodb_table.areas.stream_arn

  batch_size        = 10
  starting_position = "TRIM_HORIZON"
}

resource "aws_lambda_function" "notify" {
  function_name = local.lambda_fn_notify_name
  role          = aws_iam_role.fn_exec.arn

  description                    = "Given a geographical area: emit a GEOGRAPHICAL_AREA_IDENTIFIED event.\n"
  handler                        = "notify.handler"
  memory_size                    = 256
  reserved_concurrent_executions = 1
  runtime                        = "nodejs12.x"
  s3_bucket                      = data.aws_s3_object.notify_fn.bucket
  s3_key                         = data.aws_s3_object.notify_fn.key
  s3_object_version              = data.aws_s3_object.notify_fn.version_id
  timeout                        = 6

  environment {
    variables = {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = 1
      EVENT_BUS                           = "default"
      EVENT_SOURCE                        = "property-data.geographical-areas"
    }
  }

  tags = {
    SERVICE = var.service
  }
}

import {
  to = aws_lambda_event_source_mapping.notify
  id = "a11faad6-f8a5-453a-b97d-f971876c128d"
}

import {
  to = aws_lambda_function.notify
  id = local.lambda_fn_notify_name
}
