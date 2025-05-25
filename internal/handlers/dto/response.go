package dto

import (
	"github.com/CryptoRodeo/kite/internal/domain"
)

// DTOs (Data Transfer Objects)
// These allow us to carry and format data between layers or services, without embedding any business logic.

type IssueResponse struct {
	Data   []domain.Issue `json:"data"`
	Total  int64          `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}
