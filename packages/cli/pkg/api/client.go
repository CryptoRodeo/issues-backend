package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/CryptoRodeo/kite/packages/cli/pkg/config"
	"github.com/CryptoRodeo/kite/packages/cli/pkg/models"
)

// Client is the API client for the Konflux issues API
type Client struct {
	httpClient *http.Client
	baseURL    string
}

// New creates a new API client
func New() *Client {
	cfg := config.GetConfig()
	return &Client{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		baseURL: cfg.APIUrl,
	}
}

// GetIssues retrieves issues with optional filters
func (c *Client) GetIssues(namespace string, filters map[string]string) ([]models.Issue, error) {
	// Build query parameters
	params := url.Values{}
	params.Add("namespace", namespace)
	for key, value := range filters {
		if value != "" {
			params.Add(key, value)
		}
	}

	// Make request
	url := fmt.Sprintf("%s/issues?%s", c.baseURL, params.Encode())
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get issues: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return nil, c.handleAPIError(resp)
	}

	// Parse response
	var response models.IssuesResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse issues: %w", err)
	}

	return response.Data, nil
}

// GetIssueDetails retrieves details for a specific issue
func (c *Client) GetIssueDetails(id, namespace string) (*models.Issue, error) {
	// Build query parameters
	params := url.Values{}
	params.Add("namespace", namespace)

	// Make request
	url := fmt.Sprintf("%s/issues/%s?%s", c.baseURL, id, params.Encode())
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get issue details: %w", err)
	}
	defer resp.Body.Close()

	// Handle not found and access denied responses
	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("issue with ID %s not found", id)
	}
	if resp.StatusCode == http.StatusForbidden {
		return nil, fmt.Errorf("access denied to namespace %s", namespace)
	}

	// Check other response statuses
	if resp.StatusCode != http.StatusOK {
		return nil, c.handleAPIError(resp)
	}

	// Parse response
	var issue models.Issue
	if err := json.NewDecoder(resp.Body).Decode(&issue); err != nil {
		return nil, fmt.Errorf("failed to parse issue details: %w", err)
	}

	return &issue, nil
}

// ResolveIssue marks an issue as resolved
func (c *Client) ResolveIssue(id, namespace string) error {
	params := url.Values{}
	params.Add("namespace", namespace)

	// Create request
	url := fmt.Sprintf("%s/issues/%s/resolve?%s", c.baseURL, id, params.Encode())
	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		return c.handleRequestError(err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Make request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return c.handleRequestError(err)
	}
	defer resp.Body.Close()

	// Handle not found and access denied responses
	if resp.StatusCode == http.StatusNotFound {
		return fmt.Errorf("issue with ID %s not found", id)
	}
	if resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("access denied to namespace %s", namespace)
	}

	// Check other response statuses
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return c.handleAPIError(resp)
	}

	return nil
}

// handleRequestError handles HTTP request errors with improved error messages
func (c *Client) handleRequestError(err error) error {
	if err == nil {
		return nil
	}

	// Check for timeout
	if urlErr, ok := err.(*url.Error); ok && urlErr.Timeout() {
		return fmt.Errorf("request timed out: please check your network connection and try again")
	}

	// Check for network connectivity issues
	return fmt.Errorf("network error: %w (please check your connection and API URL configuration)", err)
}

// handleAPIError handles API error responses with improved error messages
func (c *Client) handleAPIError(resp *http.Response) error {
	body, _ := io.ReadAll(resp.Body)

	// Try to parse error as JSON
	var apiError struct {
		Error   string `json:"error"`
		Message string `json:"message"`
	}

	if err := json.Unmarshal(body, &apiError); err == nil && (apiError.Error != "" || apiError.Message != "") {
		if apiError.Error != "" {
			return fmt.Errorf("API error (status %d): %s", resp.StatusCode, apiError.Error)
		}
		return fmt.Errorf("API error (status %d): %s", resp.StatusCode, apiError.Message)
	}

	// Handle different status codes
	switch resp.StatusCode {
	case http.StatusUnauthorized:
		return fmt.Errorf("authentication error: you are not authorized to access this resource")
	case http.StatusForbidden:
		return fmt.Errorf("permission denied: you don't have access to this resource")
	case http.StatusNotFound:
		return fmt.Errorf("resource not found: please check the URL or parameters")
	case http.StatusTooManyRequests:
		return fmt.Errorf("rate limit exceeded: please try again later")
	case http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable:
		return fmt.Errorf("server error (status %d): the server is currently unavailable, please try again later", resp.StatusCode)
	default:
		// Default error message with body if available
		if len(body) > 0 {
			return fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
		}
		return fmt.Errorf("API error (status %d)", resp.StatusCode)
	}
}
