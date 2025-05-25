package domain

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// IssueScope represents the scope of an Issue
type IssueScope struct {
	ID                string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ResourceType      string `gorm:"not null" json:"resourceType"`
	ResourceName      string `gorm:"not null" json:"resourceName"`
	ResourceNamespace string `gorm:"not null" json:"resourceNamespace"`

	// Relationship - one issue scope has one issue
	Issue *Issue `gorm:"foreignKey:ScopeID" json:"issue,omitempty"`
}

// BeforeCreate hook to set UUID if not provided
func (s *IssueScope) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}
