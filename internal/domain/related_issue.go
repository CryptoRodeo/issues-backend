package domain

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RelatedIssue represetns relationships between issues
type RelatedIssue struct {
	ID       string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SourceID string `gorm:"type:uuid;not null" json:"sourceId"`
	TargetID string `gorm:"type:uuid;not null" json:"targetId"`

	// Relationships
	Source Issue `gorm:"foreignKey:SourceID" json:"source,omitempty"`
	Target Issue `gorm:"foreignKey:TargetID" json:"target,omitempty"`
}

// BeforeCreate hook to set UUID if not provided
func (r *RelatedIssue) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}
