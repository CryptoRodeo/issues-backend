package domain

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Link represents a link associated with an issue
type Link struct {
	ID      string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title   string `gorm:"not null" json:"title"`
	URL     string `gorm:"not null" json:"url"`
	IssueID string `gorm:"type:uuid;not null" json:"issueId"`
	// Omit field when converting to JSON or deconverting from JSON
	Issue Issue `gorm:"foreignKey:IssueID" json:"-"`
}

// BeforeCreate hook to set UUID if not provided
func (l *Link) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	return nil
}
