package dto

import (
	"time"

	"github.com/konflux-ci/kite/internal/models"
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
	Severity    models.Severity     `json:"severity" binding:"required"`
	IssueType   models.IssueType    `json:"issueType" binding:"required"`
	State       models.IssueState   `json:"state"`
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
	Severity    *models.Severity    `json:"severity"`
	IssueType   *models.IssueType   `json:"issueType"`
	State       *models.IssueState  `json:"state"`
	ResolvedAt  *time.Time          `json:"resolvedAt"`
	Links       []CreateLinkRequest `json:"links"`
}
