package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/CryptoRodeo/kite/internal/models"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type IssueService struct {
	db     *gorm.DB       // Database instance
	logger *logrus.Logger // Logging instance
}

type IssueQueryFilters struct {
	Namespace    string
	Severity     *models.Severity
	IssueType    *models.IssueType
	State        *models.IssueState
	ResourceType string
	ResourceName string
	Search       string
	Limit        int
	Offset       int
}

type DuplicateCheckResult struct {
	IsDuplicate   bool
	ExistingIssue *models.Issue
}

func NewIssueService(db *gorm.DB, logger *logrus.Logger) *IssueService {
	return &IssueService{
		db:     db,
		logger: logger,
	}
}

// CheckForDuplicateIssue checks if a similar issue already exists
func (s *IssueService) CheckForDuplicateIssue(req models.CreateIssueRequest) (*DuplicateCheckResult, error) {
	var existingIssue models.Issue
	err := s.db.
		Preload("Links").
		Joins("JOIN issue_scopes on issues.scope_id = issue_scopes.id").
		Where("issues.namespace = ? AND issues.issue_type = ? AND issues.state = ?",
			req.Namespace, req.IssueType, models.IssueStateActive).
		Where("issue_scopes.resource_type = ? AND issue_scopes.resource_name = ? AND issue_scopes.resource_namespace = ?",
			req.Scope.ResourceType, req.Scope.ResourceName, req.Namespace).
		First(&existingIssue).Error
	if err != nil {
		// Check if the error is no record was found.
		// If it is, the issue is not a duplicate.
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &DuplicateCheckResult{IsDuplicate: false}, nil
		}
		s.logger.WithError(err).Error("Failed to check for duplicate issues")
		return nil, fmt.Errorf("faield to check for duplicates: %w", err)
	}
	s.logger.WithField("existing_issue_id", existingIssue.ID).Info("found duplicate")
	return &DuplicateCheckResult{
		IsDuplicate:   true,
		ExistingIssue: &existingIssue,
	}, nil
}

// FindIssues retrieves issues with optional filters
func (s *IssueService) FindIssues(filters IssueQueryFilters) (*models.IssueResponse, error) {
	var issues []models.Issue
	var total int64

	// Build base query
	// Preload any associations
	query := s.db.Model(&models.Issue{}).
		Preload("Scope").
		Preload("Links").
		Preload("RelatedFrom.Target.Scope").
		Preload("RelatedTo.Source.Scope")

	// Apply filters to the database query
	if filters.Namespace != "" {
		query = query.Where("namespace = ?", filters.Namespace)
	}
	if filters.Severity != nil {
		query = query.Where("severity = ?", *filters.Severity)
	}
	if filters.IssueType != nil {
		query = query.Where("issue_type = ?", *filters.IssueType)
	}
	if filters.State != nil {
		query = query.Where("state = ?", *filters.State)
	}
	if filters.ResourceType != "" {
		query = query.Joins("JOIN issue_scopes ON issues.scope_id = issue_scopes.id").
			Where("issue_scopes.resource_type = ?", filters.ResourceType)
	}
	if filters.ResourceName != "" {
		query = query.Joins("JOIN issue_scopes ON issues.scope_id = issue_scopes.id").
			Where("issue_scopes.resource_name = ?", filters.ResourceName)
	}
	if filters.Search != "" {
		searchPattern := "%" + filters.Search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ?", searchPattern, searchPattern)
	}

	// Get total count for pagination
	if err := query.Count(&total).Error; err != nil {
		s.logger.WithError(err).Error("Failed to count issues")
		return nil, fmt.Errorf("failed to count issues: %w", err)
	}

	// Apply pagination and ordering
	if filters.Limit == 0 {
		filters.Limit = 50
	}

	if err := query.Order("detected_at DESC").
		Offset(filters.Offset).
		Limit(filters.Limit).
		Find(&issues).
		Error; err != nil {
		s.logger.WithError(err).Error("Failed to find issues")
		return nil, fmt.Errorf("failed to find issues: %w", err)
	}

	return &models.IssueResponse{
		Data:   issues,
		Total:  total,
		Limit:  filters.Limit,
		Offset: filters.Offset,
	}, nil
}

// FindIssueByID retrieves a single issue by ID
func (s *IssueService) FindIssueByID(id string) (*models.Issue, error) {
	var issue models.Issue

	// Find issue, load associations
	err := s.db.
		Preload("Scope").
		Preload("RelatedFrom.Target.Scope").
		Preload("RelatedTo.Source.Scope").
		First(&issue, "id = ?", id).Error

	if err != nil {
		// Check if the error is record not found
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		s.logger.WithError(err).WithField("issue_id", id).Error("Failed to find issue by ID")
		return nil, fmt.Errorf("failed to find issue: %w", err)
	}

	return &issue, nil
}

// CreateIssue creates a new issue
func (s *IssueService) CreateIssue(req models.CreateIssueRequest) (*models.Issue, error) {
	// check for duplicates
	duplicateResult, err := s.CheckForDuplicateIssue(req)
	if err != nil {
		return nil, fmt.Errorf("failed to check for duplicates: %w", err)
	}

	// Check if this issue is a duplicate.
	if duplicateResult.IsDuplicate && duplicateResult.ExistingIssue != nil {
		// Update existing issue instead of creating a new one
		updateReq := models.UpdateIssueRequest{
			Title:       &req.Title,
			Description: &req.Description,
			Severity:    &req.Severity,
			IssueType:   &req.IssueType,
		}
		if req.State != "" {
			updateReq.State = &req.State
		}
		return s.UpdateIssue(duplicateResult.ExistingIssue.ID, updateReq)
	}

	// Create new issue
	now := time.Now()
	state := req.State
	// Assume the state of the issue is active if not sent in request
	if state == "" {
		state = models.IssueStateActive
	}

	// Set resource namespace to match issue namespace if not provided
	resourceNamespace := req.Scope.ResourceName
	if resourceNamespace == "" {
		resourceNamespace = req.Namespace
	}

	issue := models.Issue{
		Title:       req.Title,
		Description: req.Description,
		Severity:    req.Severity,
		IssueType:   req.IssueType,
		State:       req.State,
		DetectedAt:  now,
		Namespace:   req.Namespace,
		Scope: models.IssueScope{
			ResourceType:      req.Scope.ResourceType,
			ResourceName:      req.Scope.ResourceName,
			ResourceNamespace: req.Scope.ResourceNamespace,
		},
	}

	// Convert any links
	for _, linkReq := range req.Links {
		issue.Links = append(issue.Links, models.Link{
			Title: linkReq.Title,
			URL:   linkReq.URL,
		})
	}

	// Create in a transaction
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&issue).Error; err != nil {
			return fmt.Errorf("failed to create issue: %w", err)
		}
		return nil
	})

	if err != nil {
		s.logger.WithError(err).Error("Failed to create issue")
		return nil, err
	}

	s.logger.WithField("issue_id", issue.ID).Info("Created new issue")

	// Reload with associations
	return s.FindIssueByID(issue.ID)
}

// UpdateIssue updates and existing issue
func (s *IssueService) UpdateIssue(id string, req models.UpdateIssueRequest) (*models.Issue, error) {
	// Find existing issue
	existingIssue, err := s.FindIssueByID(id)
	if err != nil {
		return nil, err
	}
	if existingIssue == nil {
		return nil, fmt.Errorf("issue with ID %s not found", id)
	}

	// Prepare updates
	updates := map[string]interface{}{
		"updated_at": time.Now(),
	}

	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Severity != nil {
		updates["severity"] = *req.Severity
	}
	if req.IssueType != nil {
		updates["issue_type"] = *req.IssueType
	}
	if req.State != nil {
		updates["state"] = *req.State
		// Handle state change to RESOLVED
		if *req.State == models.IssueStateResolved && existingIssue.State != models.IssueStateResolved {
			now := time.Now()
			// Add time when issue was resolved
			updates["resolved_at"] = &now
		}
	}
	if req.ResolvedAt != nil {
		updates["resolved_at"] = req.ResolvedAt
	}

	// Perform updates in a transaction
	// Update issue first, then links (if any)
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Update issue
		if err := tx.Model(&existingIssue).Updates(updates).Error; err != nil {
			return fmt.Errorf("failed to update issue: %w", err)
		}

		// Handle link updates if provided
		if req.Links != nil {
			// Delete old links
			if err := tx.Where("issue_id = ?", id).Delete(&models.Link{}).Error; err != nil {
				return fmt.Errorf("failed to delete old links: %w", err)
			}

			// Create new links
			for _, linkReq := range req.Links {
				link := models.Link{
					Title:   linkReq.Title,
					URL:     linkReq.URL,
					IssueID: id,
				}
				if err := tx.Create(&link).Error; err != nil {
					return fmt.Errorf("failed to create link: %w", err)
				}
			}
		}
		return nil
	})

	if err != nil {
		s.logger.WithError(err).WithField("issue_id", id).Error("Failed to update issue")
		return nil, err
	}

	s.logger.WithField("issue_id", id).Info("Updated issue")

	return s.FindIssueByID(id)
}

// DeleteIssue deletes an issue and related entities
func (s *IssueService) DeleteIssue(id string) error {
	// Find the issue to get scope ID
	issue, err := s.FindIssueByID(id)
	if err != nil {
		return err
	}
	if issue == nil {
		return fmt.Errorf("issue with ID %s not found", id)
	}

	// Delete in transaction so we have control of the order
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Delete related issue relationships first using issue id
		if err := tx.Where("source_id = ? OR target_id = ?", id, id).Delete(&models.RelatedIssue{}).Error; err != nil {
			return fmt.Errorf("failed to delete related issues: %w", err)
		}

		// Delete links by issue id
		if err := tx.Where("issue_id = ?", id).Delete(&models.Link{}).Error; err != nil {
			return fmt.Errorf("failed to delete links: %w", err)
		}

		// Delete the issue by id
		if err := tx.Delete(&models.Issue{}, "id = ?", id).Error; err != nil {
			return fmt.Errorf("failed to delete issue: %w", err)
		}

		// Delete the issue scope by scope id
		if err := tx.Delete(&models.IssueScope{}, "id = ?", issue.ScopeID).Error; err != nil {
			return fmt.Errorf("failed to delete issue scope: %w", err)
		}

		return nil
	})

	if err != nil {
		s.logger.WithError(err).WithField("issue_id", id).Error("failed to delete issue")
		return err
	}

	s.logger.WithField("issue_id", id).Info("Deleted issue")
	return nil
}

// AddRelatedIsue creates a relationship between two issues
func (s *IssueService) AddRelatedIssue(sourceID, targetID string) error {
	// Check if both issues exist
	source, err := s.FindIssueByID(sourceID)
	if err != nil {
		return err
	}
	target, err := s.FindIssueByID(targetID)
	if err != nil {
		return err
	}
	if source == nil || target == nil {
		return errors.New("one or both issues not found")
	}

	// Check if relationship already exists
	var existingRelation models.RelatedIssue
	err = s.db.Where("(source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)",
		sourceID, targetID, targetID, sourceID).First(&existingRelation).Error

	if err == nil {
		return errors.New("relationship already exists")
	}
	// Check if we get any other error besides Record Not Found
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to check exiting relationship: %w", err)
	}

	// Create relationship
	relation := models.RelatedIssue{
		SourceID: sourceID,
		TargetID: targetID,
	}

	if err := s.db.Create(&relation).Error; err != nil {
		s.logger.WithError(err).Error("Failed to add related issue")
		return fmt.Errorf("failed to create relationship: %w", err)
	}

	s.logger.WithFields(logrus.Fields{
		"source_id": sourceID,
		"target_id": targetID,
	}).Info("Added related issue")
	return nil
}

// RemoveRelatedIssue removes a relationship between issues
func (s *IssueService) RemoveRelatedIssue(sourceID, targetID string) error {
	result := s.db.Where("(source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)",
		sourceID, targetID, targetID, sourceID).Delete(&models.RelatedIssue{})

	if result.Error != nil {
		s.logger.WithError(result.Error).Error("failed to remove related issue")
		return fmt.Errorf("failed to remove relationship: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("relationship not found")
	}

	s.logger.WithFields(logrus.Fields{
		"source_id": sourceID,
		"target_id": targetID,
	}).Info("Removed related issue")

	return nil
}

// ResolveIssuesByScope resolves all active issues for a given scope
func (s *IssueService) ResolveIssuesByScope(resourceType, resourceName, namespace string) (int64, error) {
	now := time.Now()

	result := s.db.Model(&models.Issue{}).
		Joins("JOIN issue_scopes ON issues.scope_id = issue_scopes.id").
		Where("issues.state = ? AND issues.namespace = ?", models.IssueStateActive, namespace).
		Where("issue_scopes.resource_type = ? AND issue_scopes.resource_name = ?", resourceType, resourceName).
		Updates(map[string]any{
			"state":       models.IssueStateResolved,
			"resolved_at": &now,
			"updated_at":  now,
		})

	if result.Error != nil {
		s.logger.WithError(result.Error).Error("Failed to resolve issues by scope")
		return 0, fmt.Errorf("failed to resolve issues: %w", result.Error)
	}

	count := result.RowsAffected
	s.logger.WithFields(logrus.Fields{
		"resource_type": resourceType,
		"resource_name": resourceName,
		"namespace":     namespace,
		"count":         count,
	}).Info("Resolved issues by scope")

	return count, nil
}
