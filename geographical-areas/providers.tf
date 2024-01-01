provider "aws" {
  default_tags {
    tags = {
      STAGE = var.stage
    }
  }
}
