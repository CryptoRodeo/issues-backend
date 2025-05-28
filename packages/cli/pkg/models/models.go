package models

import "time"

type IssuesResponse struct {
	Data []Issue `json:"data"`
}

// Issue represents an issue in Konflux
type Issue struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Severity    string     `json:"severity"`
	IssueType   string     `json:"issueType"`
	State       string     `json:"state"`
	DetectedAt  time.Time  `json:"detectedAt"`
	ResolvedAt  *time.Time `json:"resolvedAt"`
	Namespace   string     `json:"namespace"`
	ScopeID     string     `json:"scopeId"`
	Scope       Scope      `json:"scope"`
	Links       []Link     `json:"links"`
	RelatedFrom []Related  `json:"relatedFrom"`
	RelatedTo   []Related  `json:"relatedTo"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// Scope represents the scope of an issue
type Scope struct {
	ID                string `json:"id"`
	ResourceType      string `json:"resourceType"`
	ResourceName      string `json:"resourceName"`
	ResourceNamespace string `json:"resourceNamespace"`
}

// Link represents a link associated with an issue
type Link struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	URL     string `json:"url"`
	IssueID string `json:"issueId"`
}

// Related represents a related issue
type Related struct {
	ID       string `json:"id"`
	SourceID string `json:"sourceId"`
	TargetID string `json:"targetId"`
	Target   *Issue `json:"target,omitempty"`
	Source   *Issue `json:"source,omitempty"`
}

// TypeCount represents the count of issues by type
type TypeCount struct {
	IssueType string `json:"issueType"`
	Count     int    `json:"count"`
}

// SeverityCount represents the count of issues by severity
type SeverityCount struct {
	Severity string `json:"severity"`
	Count    int    `json:"count"`
}
