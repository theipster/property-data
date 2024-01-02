locals {
  iam_fn_exec_role_name              = "${var.service}-${var.stage}-${data.aws_region.this.name}-lambdaRole"
  iam_cloudwatch_logs_group_wildcard = "arn:aws:logs:${data.aws_region.this.name}:${data.aws_caller_identity.this.account_id}:log-group:/aws/lambda/${var.service}-${var.stage}*"
}

data "aws_iam_policy_document" "fn_exec_permissions" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
    ]

    resources = ["${local.iam_cloudwatch_logs_group_wildcard}:*"]
  }

  statement {
    actions   = ["logs:PutLogEvents"]
    resources = ["${local.iam_cloudwatch_logs_group_wildcard}:*:*"]
  }

  statement {
    actions   = ["events:PutEvents"]
    resources = ["arn:aws:events:*:*:event-bus/*"]
  }

  statement {
    actions = [
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:DescribeStream",
      "dynamodb:ListStreams",
    ]

    resources = [aws_dynamodb_table.areas.stream_arn]
  }
}

data "aws_iam_policy_document" "fn_exec_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "fn_exec" {
  assume_role_policy = data.aws_iam_policy_document.fn_exec_trust.json

  name = local.iam_fn_exec_role_name

  inline_policy {
    name   = "${var.service}-${var.stage}-lambda"
    policy = data.aws_iam_policy_document.fn_exec_permissions.json
  }
}

import {
  to = aws_iam_role.fn_exec
  id = local.iam_fn_exec_role_name
}
