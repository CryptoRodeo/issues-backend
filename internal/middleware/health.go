package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

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
