package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/CryptoRodeo/kite/internal/config"
	"github.com/CryptoRodeo/kite/internal/handlers"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

func main() {
	// Load environment variable
	// TODO - Have this load ENV files using PROJECT_ENV value
	if err := godotenv.Load(); err != nil {
		// It's okay if .env file doesn't exist
		fmt.Println("No .env file found, using system environment variables")
	}

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("Failed to load configuration: %w\n", err)
		os.Exit(1)
	}

	// Initialize logger
	logger := setupLogger()

	logger.WithFields(logrus.Fields{
		"environment": cfg.Server.Environment,
		"version":     getVersion(),
	})

	// Initialzie database
	db, err := config.InitDatabase()
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize database")
	}

	// Get database instance for cleanup
	sqlDB, err := db.DB()
	if err != nil {
		logger.WithError(err).Fatal("Failed to get database instance")
	}
	defer sqlDB.Close()

	// Setup router
	router, err := handlers.SetupRouter(db, logger)
	if err != nil {
		logger.WithError(err).Fatal("Failed to setup router")
	}

	// Setup HTTP server with configuration
	server := &http.Server{
		Addr:         cfg.GetServerAddress(),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Lets start the server in a goroutine.
	// This lets us run the server in this anonymous function concurrently
	// while allowing main() to continue instead of blockign on ListenAndServe().
	go func() {
		logger.WithFields(logrus.Fields{
			"address":     cfg.GetServerAddress(),
			"environment": cfg.Server.Environment,
		}).Info("Starting HTTP Server")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.WithError(err).Fatal("Failed to start server")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	// Create a channel that carries os.Signal values, buffer size 1
	quit := make(chan os.Signal, 1)
	// Notify 'quit' channel whenver the process receives SIGINT (Ctrl+C) or SIGTERM
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	// Block here (don't run anything after the next line) until one of those signals is received
	// Because the buffer size is one, once the signal is recieved we'll process the rest of the function.
	<-quit

	logger.Info("Shutting down server...")

	// Create a context with timeout for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	// Shut down server
	if err := server.Shutdown(ctx); err != nil {
		logger.WithError(err).Error("Server forced to shutdown")
	} else {
		logger.Info("Server shutdown gracefully")
	}
}

func setupLogger() *logrus.Logger {
	logger := logrus.New()

	// Set log level
	logLevel := config.GetEnvOrDefault("LOG_LEVEL", "info")
	level, err := logrus.ParseLevel(logLevel)
	if err != nil {
		level = logrus.InfoLevel
	}
	logger.SetLevel(level)

	// Set log format
	if config.GetEnvOrDefault("PROJECT_ENV", "development") == "production" {
		logger.SetFormatter(&logrus.JSONFormatter{})
	} else {
		logger.SetFormatter(&logrus.TextFormatter{
			FullTimestamp: true,
			ForceColors:   true,
		})
	}

	return logger
}

func getVersion() string {
	// This should be set during build time
	if version := os.Getenv("VERSION"); version != "" {
		return version
	}
	return "dev"
}
