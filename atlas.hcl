# Atlas configuration

# Run this program, capture the output, use that as the schema.
data "external_schema" "gorm" {
  program = [
    "go",
    "run",
    "-mod=mod",
    "cmd/atlas-loader/main.go",
  ]
}

env "development" {
  # data.external_schema.gorm -> Run the program above to get schema info
  # data.external_schema.gorm.url -> The schema definition the program produced
  src = data.external_schema.gorm.url
  url = env("DATABASE_URL")
  migration {
    dir = "file://migrations"
  }
  format {
    migrate {
      diff = "{{ sql . \" \" }}"
    }
  }
}