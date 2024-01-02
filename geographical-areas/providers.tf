provider "aws" {
  default_tags {
    tags = {
      STAGE = var.stage
    }
  }
}

provider "aws" {
  alias = "no_tags"
}
