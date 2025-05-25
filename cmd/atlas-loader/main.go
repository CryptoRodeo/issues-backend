package main

import (
	"io"
	"log"
	"os"

	"ariga.io/atlas-provider-gorm/gormschema"
	"github.com/CryptoRodeo/kite/internal/domain"
)

func main() {
	// Load all the models, generate SQL statements for them.
	stmts, err := gormschema.New("postgres").Load(
		&domain.IssueScope{},
		&domain.Issue{},
		&domain.Link{},
		&domain.RelatedIssue{},
	)

	if err != nil {
		log.Fatalf("failed to load gorm schema: %v", err)
	}

	// Output statements to stdout
	io.WriteString(os.Stdout, stmts)
}
