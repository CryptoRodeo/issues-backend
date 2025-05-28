.PHONY: build install clean test kubectl-plugin

# Binary name
BINARY_NAME=konflux-issues
KUBECTL_PLUGIN_NAME=kubectl-issues

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOFMT=$(GOCMD) fmt

# Default target
all: fmt test build

# Build the binary
build:
	$(GOBUILD) -o $(BINARY_NAME) -v main.go

# Format the code
fmt:
	$(GOFMT) ./...

# Run tests
test:
	$(GOTEST) -v ./...

# Install the binary
install: build
	mkdir -p $(HOME)/.local/bin
	cp $(BINARY_NAME) $(HOME)/.local/bin/

# Install as kubectl plugin
kubectl-plugin: install
	ln -sf $(HOME)/.local/bin/$(BINARY_NAME) $(HOME)/.local/bin/$(KUBECTL_PLUGIN_NAME)

# Clean build files
clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)

# Cross-compile for multiple platforms
cross-compile:
	# Linux
	GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_NAME)-linux-amd64 -v main.go
	# MacOS
	GOOS=darwin GOARCH=amd64 $(GOBUILD) -o $(BINARY_NAME)-darwin-amd64 -v main.go
	# Windows
	GOOS=windows GOARCH=amd64 $(GOBUILD) -o $(BINARY_NAME)-windows-amd64.exe -v main.go

# Create GitHub release archives
release: cross-compile
	mkdir -p release
	tar -czvf release/$(BINARY_NAME)-linux-amd64.tar.gz $(BINARY_NAME)-linux-amd64
	tar -czvf release/$(BINARY_NAME)-darwin-amd64.tar.gz $(BINARY_NAME)-darwin-amd64
	zip -r release/$(BINARY_NAME)-windows-amd64.zip $(BINARY_NAME)-windows-amd64.exe
