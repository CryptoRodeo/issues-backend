package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	authv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// Logger middleware for request logging
func Logger(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// Process request
		c.Next()

		// Log request
		duration := time.Since(start)
		statusCode := c.Writer.Status()

		logEntry := logger.WithFields(logrus.Fields{
			"method":     method,
			"path":       path,
			"status":     statusCode,
			"duration":   duration,
			"ip":         c.ClientIP(),
			"user_agent": c.Request.UserAgent(),
		})

		if statusCode >= 400 {
			logEntry.Warn("HTTP Request")
		} else {
			logEntry.Info("HTTP Request")
		}
	}
}

// ErrorHandler middleware for handling panics and errors
func ErrorHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				logger.WithField("error", err).Error("Panic recovered")
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Internal server error",
				})
				c.Abort()
			}
		}()
		c.Next()
	}
}

// CORS middlware
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Conrol-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin,COntent-Type,Accept,Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}
		c.Next()
	}
}

// Kubernetes namespaces access checker
type NamespaceChecker struct {
	client kubernetes.Interface
	logger *logrus.Logger
}

func NewNamespaceChecker(logger *logrus.Logger) (*NamespaceChecker, error) {
	// Try to create Kubernetes client

	// Attempt to get project local kubeconfig
	var kubeconfigPath string
	cwd, cwdErr := os.Getwd()
	if cwdErr == nil {
		kubeconfigPath = filepath.Join(cwd, "config", "kubeconfig.yaml")
		if _, statErr := os.Stat(kubeconfigPath); statErr != nil {
			// Reset, look elsewhere
			kubeconfigPath = ""
		}
	}

	// Build config: prefer in-cluster -> local file -> default home
	config, err := rest.InClusterConfig()
	if err != nil {
		var cfgErr error
		if kubeconfigPath != "" {
			logger.Infof("Using project local kubeconfig: %s", kubeconfigPath)
			config, cfgErr = clientcmd.BuildConfigFromFlags("", kubeconfigPath)
		} else {
			logger.Info("No project local kubeconfig, falling back to ~/.kube/config")
			config, cfgErr = clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
		}
		if cfgErr != nil {
			logger.WithError(cfgErr).Warn("Failed to create a Kubernetes client, namespace check disabled")
		}
	}

	// Only create a clientset if we have a valid config
	if config == nil {
		logger.Warn("No valid kubernetes configuration found, namespace checking disabled")
		return &NamespaceChecker{client: nil, logger: logger}, nil
	}

	// Create clientset using config retrieved
	clientset, k8sCsErr := kubernetes.NewForConfig(config)
	if k8sCsErr != nil {
		logger.WithError(k8sCsErr).Warn("Failed to create Kubernetes clientset, namespace checking disabled")
		return &NamespaceChecker{client: nil, logger: logger}, nil
	}

	return &NamespaceChecker{client: clientset, logger: logger}, nil
}

func (nc *NamespaceChecker) CheckNamespacessAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get namespaces from params, body or query
		namespace := c.Param("namespace")
		if namespace == "" {
			namespace = c.Query("namespace")
		}
		if namespace == "" {
			// Try to get from request body
			if c.Request.Method == "POST" || c.Request.Method == "PUT" {
				if body, exists := c.Get("requestBody"); exists {
					if bodyMap, ok := body.(map[string]interface{}); ok {
						if ns, ok := bodyMap["namespace"].(string); ok {
							namespace = ns
						}
					}
				}
			}
		}

		if namespace == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing namespace"})
			c.Abort()
			return
		}

		// If K8s client is not available, skip check
		if nc.client == nil {
			nc.logger.Debug("Kubernetes client not available, skipping namespace access check")
			c.Next()
			return
		}

		// Check if user has access to the namespace by checking if they can get pods
		if err := nc.checkPodAccess(namespace); err != nil {
			nc.logger.WithError(err).WithField("namespace", namespace).Warn("Access Denied")
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this namespace"})
			c.Abort()
			return
		}

		nc.logger.WithField("namespace", namespace).Debug("Access allowed")
		c.Next()
	}
}

func (nc *NamespaceChecker) checkPodAccess(namespace string) error {
	if nc.client == nil {
		return nil // Skip check if client is not available
	}

	// Create a SelfSubjectAccessReview to check if the user can get pods in the namespace
	accessReview := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Namespace: namespace,
				Verb:      "get",
				Resource:  "pods",
			},
		},
	}

	// Run the access review for max 10 seconds
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := nc.client.AuthorizationV1().SelfSubjectAccessReviews().Create(
		ctx, accessReview, metav1.CreateOptions{})

	if err != nil {
		return fmt.Errorf("failed to check namespace access: %w", err)
	}

	if !result.Status.Allowed {
		return fmt.Errorf("access denied to namespace %s", namespace)
	}

	return nil
}

// Validation middleware for request validation
func ValidateID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" || len(id) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID parameter"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// Health check middleware that ca nbe used to verify dependencies
func HealthCheck(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "UP",
			"message":   "Service is healthy",
			"timestamp": time.Now().UTC(),
		})
	}
}
