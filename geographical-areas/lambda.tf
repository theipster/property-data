locals {
  lambda_fn_notify_name = "${var.service}-${var.stage}-notify"
}

resource "aws_lambda_event_source_mapping" "notify" {
  function_name = aws_lambda_function.notify.arn

  event_source_arn = aws_dynamodb_table.areas.stream_arn
}

resource "aws_lambda_function" "notify" {
  function_name = local.lambda_fn_notify_name
  role          = aws_iam_role.fn_exec.arn
}

import {
  to = aws_lambda_event_source_mapping.notify
  id = "a11faad6-f8a5-453a-b97d-f971876c128d"
}

import {
  to = aws_lambda_function.notify
  id = local.lambda_fn_notify_name
}
