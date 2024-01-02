locals {
  cloudwatch_notify_fn_group_name = "/aws/lambda/${local.lambda_fn_notify_name}"
}

resource "aws_cloudwatch_log_group" "notify_fn" {
  provider = aws.no_tags

  name = local.cloudwatch_notify_fn_group_name

  retention_in_days = 14
}

import {
  to = aws_cloudwatch_log_group.notify_fn
  id = local.cloudwatch_notify_fn_group_name
}
