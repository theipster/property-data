variable "service" {
  description = "Name of the app/service."
  type        = string
}

variable "stage" {
  description = "Name of the (Serverless Framework) stage. For cross-compatibility."
  type        = string
}
