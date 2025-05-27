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
		kubeconfigPath = filepath.Join(cwd, "configs", "kube-config.yaml")
		logger.Infof("Using path %s", kubeconfigPath)
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
