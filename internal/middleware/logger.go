package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
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
