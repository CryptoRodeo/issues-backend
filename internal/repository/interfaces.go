package repository

import (
	"context"

	"github.com/CryptoRodeo/kite/internal/handlers/dto"
	"github.com/CryptoRodeo/kite/internal/models"
)

type IssueRepository interface {
	Create(ctx context.Context, issue *models.Issue) (*models.Issue, error)
	FindByID(ctx context.Context, id string) (*models.Issue, error)
	Update(ctx context.Context, id string, updates dto.UpdateIssueRequest) (*models.Issue, error)
	Delete(ctx context.Context, id string) error
	// TODO - move IssueQueryFilters somewhere else
	FindAll(ctx context.Context, filters IssueQueryFilters) (*[]models.Issue, error)
	CheckDuplicate(ctx context.Context, req dto.CreateIssueRequest) (*DuplicateCheckResult, error)
	ResolveByScope(ctx context.Context, resourceType, resourceName, namespace string) (int64, error)
}

type LinkRepository interface {
	CreateBatch(ctx context.Context, issueID string, links []models.Link) error
	DeleteByIssueID(ctx context.Context, issueID string) error
}
