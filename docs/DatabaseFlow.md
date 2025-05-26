# Database Flow

The following flow is used:
```
GORM models -> Atlas loader program -> Generates SQL statements -> Atlas Schema Reference
```
In more detail:
- The **GORM models** are the structs in `models.go`
- The **Atlas Loader** converts Go structs to SQL CREATE statements
- The **SQL output** is the complete schema in SQL
- The **Atlas schema reference** `data.external_schema.gorm.url` points to this SQL output

You can test the generated SQL output by running:
```bash
go run cmd/atlas-loader/main.go
```