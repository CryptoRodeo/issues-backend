package dto

import (
	"time"

	"github.com/CryptoRodeo/kite/internal/domain"
)

// DTOs (Data Transfer Objects)
// These allow us to carry and format data between layers or services, without embedding any business logic.

// For requests

type ScopeReqBody struct {
	ResourceType      string `json:"resourceType" binding:"required"`
	ResourceName      string `json:"resourceName" binding:"required"`
	ResourceNamespace string `json:"resourceNamespace"`
}

type CreateIssueRequest struct {
	Title       string              `json:"title" binding:"required"`
	Description string              `json:"description" binding:"required"`
	Severity    domain.Severity     `json:"severity" binding:"required"`
	IssueType   domain.IssueType    `json:"issueType" binding:"required"`
	State       domain.IssueState   `json:"state"`
	Namespace   string              `json:"namespace" binding:"required"`
	Scope       ScopeReqBody        `json:"scope" binding:"required"`
	Links       []CreateLinkRequest `json:"links"`
}

type CreateLinkRequest struct {
	Title string `json:"title" binding:"required"`
	URL   string `json:"url" binding:"required"`
}

type UpdateIssueRequest struct {
	Title       *string             `json:"title"`
	Description *string             `json:"description"`
	Severity    *domain.Severity    `json:"severity"`
	IssueType   *domain.IssueType   `json:"issueType"`
	State       *domain.IssueState  `json:"state"`
	ResolvedAt  *time.Time          `json:"resolvedAt"`
	Links       []CreateLinkRequest `json:"links"`
}
