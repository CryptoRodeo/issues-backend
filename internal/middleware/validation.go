package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

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
