package repository

import (
	"context"

	"github.com/CryptoRodeo/kite/internal/domain"
	"github.com/CryptoRodeo/kite/internal/handlers/dto"
	"github.com/CryptoRodeo/kite/internal/services"
)

type IssueRepository interface {
	Create(ctx context.Context, issue *domain.Issue) error
	FindByID(ctx context.Context, id string) (*domain.Issue, error)
	Update(ctx context.Context, id string, updates map[string]any) (*domain.Issue, error)
	Delete(ctx context.Context, id string) error
	// TODO - move IssueQueryFilters somewhere else
	FindAll(ctx context.Context, filters services.IssueQueryFilters) ([]*domain.Issue, error)
	CheckDuplicate(ctx context.Context, req dto.CreateIssueRequest) (*domain.Issue, error)
}

type LinkRepository interface {
	CreateBatch(ctx context.Context, issueID string, links []domain.Link) error
	DeleteByIssueID(ctx context.Context, issueID string) error
}
