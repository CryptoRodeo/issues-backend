package cmd

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/CryptoRodeo/kite/packages/cli/pkg/api"
	"github.com/CryptoRodeo/kite/packages/cli/pkg/config"
	"github.com/CryptoRodeo/kite/packages/cli/pkg/formatter"
	"github.com/spf13/cobra"
)

var (
	cfgFile      string
	namespace    string
	issueType    string
	severity     string
	state        string
	resourceType string
	limit        int
	issueID      string
	term         string
	outputFormat string
	unresolved   bool
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "konflux-issues",
	Short: "CLI tool for managing Konflux issues",
	Long: `A command-line interface for managing Konflux issues.
This tool allows you to list, filter, and get details about issues in Konflux.`,
}

// listCmd represents the list command
var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List issues for a namespace",
	RunE: func(cmd *cobra.Command, args []string) error {
		// If no namespace provided, try to get from kubectl context
		if namespace == "" {
			kubectlNamespace, err := getCurrentKubeNamespace()
			if err == nil {
				namespace = kubectlNamespace
			} else {
				return fmt.Errorf("namespace is required")
			}
		}

		// Apply unresolved filter if requested
		if unresolved {
			state = "ACTIVE"
		}

		// Create API client
		client := api.New()

		// Build filters
		filters := map[string]string{
			"limit":        fmt.Sprintf("%d", limit),
			"issueType":    issueType,
			"severity":     severity,
			"state":        state,
			"resourceType": resourceType,
		}

		// Get issues
		fmt.Printf("Fetching issues for namespace %s...\n", namespace)
		issues, err := client.GetIssues(namespace, filters)
		if err != nil {
			return err
		}

		// Handle empty result
		if len(issues) == 0 {
			fmt.Printf("No issues found in namespace %s with the specified filters.\n", namespace)
			return nil
		}

		// Print issues based on output format
		if outputFormat == "json" {
			formatter.PrintIssuesJSON(issues)
		} else if outputFormat == "yaml" {
			formatter.PrintIssuesYAML(issues)
		} else {
			formatter.PrintIssuesTable(issues)
		}

		return nil
	},
}

// detailsCmd represents the details command
var detailsCmd = &cobra.Command{
	Use:   "details",
	Short: "Get details for a specific issue",
	RunE: func(cmd *cobra.Command, args []string) error {
		// If no namespace provided, try to get from kubectl context
		if namespace == "" {
			kubectlNamespace, err := getCurrentKubeNamespace()
			if err == nil {
				namespace = kubectlNamespace
			} else {
				return fmt.Errorf("namespace is required")
			}
		}

		// Check for issue ID
		if issueID == "" {
			return fmt.Errorf("issue ID is required")
		}

		// Create API client
		client := api.New()

		// Get issue details
		fmt.Printf("Fetching details for issue %s in namespace %s...\n", issueID, namespace)
		issue, err := client.GetIssueDetails(issueID, namespace)
		if err != nil {
			return err
		}

		// Print issues based on output format
		if outputFormat == "json" {
			formatter.PrintIssuesDetailsJSON(issue)
		} else if outputFormat == "yaml" {
			formatter.PrintIssueDetailsYAML(issue)
		} else {
			formatter.PrintIssueDetails(issue)
		}

		return nil
	},
}

var resolveCmd = &cobra.Command{
	Use:   "resolve",
	Short: "Resolve a specific issue",
	RunE: func(cmd *cobra.Command, args []string) error {
		// If no namespace provided, try to get from kubectl context
		if namespace == "" {
			kubectlNamespace, err := getCurrentKubeNamespace()
			if err == nil {
				namespace = kubectlNamespace
			} else {
				return fmt.Errorf("namespace is required")
			}
		}

		// Check for issue ID
		if issueID == "" {
			return fmt.Errorf("issue ID is required")
		}

		// Create API client
		client := api.New()

		fmt.Printf("Resolving issue %s in namespace %s...\n", issueID, namespace)
		err := client.ResolveIssue(issueID, namespace)
		if err != nil {
			return fmt.Errorf("error resolving issue: %w", err)
		}

		fmt.Printf("Issue %s has been resolved successfully.\n", issueID)
		return nil
	},
}

var searchCmd = &cobra.Command{
	Use:   "search [term]",
	Short: "Search for issues by term",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		// If no namespace provided, try to get from kubectl context
		if namespace == "" {
			kubectlNamespace, err := getCurrentKubeNamespace()
			if err == nil {
				namespace = kubectlNamespace
			} else {
				return fmt.Errorf("namespace is required")
			}
		}

		// Get term from args
		term := args[0]

		// Create API client
		client := api.New()

		// Build filters
		filters := map[string]string{
			"limit":        fmt.Sprintf("%d", limit),
			"issueType":    issueType,
			"severity":     severity,
			"state":        state,
			"resourceType": resourceType,
			"search":       term,
		}

		// Apply unresolved filter if requested
		if unresolved {
			filters["state"] = "ACTIVE"
		}

		// Search for issues
		fmt.Printf("Searching for issues with term'%s' in namespace %s...\n", term, namespace)
		issues, err := client.GetIssues(namespace, filters)
		if err != nil {
			return fmt.Errorf("error searching issues: %w", err)
		}

		// Handle empty result
		if len(issues) == 0 {
			fmt.Printf("No issues found for term '%s' in namespace %s.\n", term, namespace)
			return nil
		}

		// Print issues based on output format
		if outputFormat == "json" {
			formatter.PrintIssuesJSON(issues)
		} else if outputFormat == "yaml" {
			formatter.PrintIssuesYAML(issues)
		} else {
			formatter.PrintIssuesTable(issues)
		}

		return nil
	},
}

// configCmd represents the config command
var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Configure CLI settings",
	Run: func(cmd *cobra.Command, args []string) {
		// Print current configuration
		cfg := config.GetConfig()
		fmt.Println("Current configuration:")
		fmt.Printf("API URL: %s\n", cfg.APIUrl)
	},
}

// setAPIURLCmd represents the config set-api-url command
var setAPIURLCmd = &cobra.Command{
	Use:   "set-api-url [url]",
	Short: "Set the API URL",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		url := args[0]
		if err := config.SetAPIURL(url); err != nil {
			return err
		}
		fmt.Printf("API URL set to: %s\n", url)
		return nil
	},
}

// resetConfigCmd represents the config reset command
var resetConfigCmd = &cobra.Command{
	Use:   "reset",
	Short: "Reset all configuration to defaults",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := config.ResetConfig(); err != nil {
			return err
		}
		fmt.Println("Configuration reset to defaults")
		return nil
	},
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	// Add commands
	rootCmd.AddCommand(listCmd)
	rootCmd.AddCommand(detailsCmd)
	rootCmd.AddCommand(resolveCmd)
	rootCmd.AddCommand(searchCmd)
	rootCmd.AddCommand(configCmd)

	configCmd.AddCommand(setAPIURLCmd)
	configCmd.AddCommand(resetConfigCmd)

	// Add common flags for all commands
	rootCmd.PersistentFlags().StringVarP(&namespace, "namespace", "n", "", "Namespace to check")
	rootCmd.PersistentFlags().StringVarP(&outputFormat, "output", "o", "", "Output format (table, json, yaml)")

	// Add list command flags
	listCmd.Flags().StringVarP(&issueType, "type", "t", "", "Filter by issue type")
	listCmd.Flags().StringVarP(&severity, "severity", "s", "", "Filter by severity")
	listCmd.Flags().StringVar(&state, "state", "", "Filter by state (ACTIVE or RESOLVED)")
	listCmd.Flags().StringVarP(&resourceType, "resource-type", "r", "", "Filter by resource type")
	listCmd.Flags().IntVar(&limit, "limit", 20, "Limit number of results")
	listCmd.Flags().BoolVar(&unresolved, "unresolved", false, "Show only unresolved issues")

	// Add details command flags
	detailsCmd.Flags().StringVarP(&issueID, "id", "i", "", "Issue ID")
	detailsCmd.MarkFlagRequired("id")

	// Add resolve command flags
	resolveCmd.Flags().StringVarP(&issueID, "id", "i", "", "Issue ID")
	resolveCmd.MarkFlagRequired("id")

	// Add search command flags
	searchCmd.Flags().StringVarP(&issueType, "type", "t", "", "Filter by issue type")
	searchCmd.Flags().StringVarP(&severity, "severity", "s", "", "Filter by severity")
	searchCmd.Flags().StringVar(&state, "state", "", "Filter by state (ACTIVE or RESOLVED)")
	searchCmd.Flags().StringVarP(&resourceType, "resource-type", "r", "", "Filter by resource type")
	searchCmd.Flags().IntVar(&limit, "limit", 20, "Limit number of results")
	searchCmd.Flags().BoolVarP(&unresolved, "unresolved", "u", false, "Show only unresolved issues")
}

// getCurrentKubeNamespace attempts to get the current namespace from kubectl context
func getCurrentKubeNamespace() (string, error) {
	cmd := exec.Command("kubectl", "config", "view", "--minify", "--output", "jsonpath={..namespace}")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	namespace := strings.TrimSpace(string(output))
	if namespace == "" {
		namespace = "default"
	}

	return namespace, nil
}
