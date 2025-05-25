#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q; do
    echo "Database is not ready yet. Waiting 2 seconds..."
    sleep 2
done
echo "Database is ready!"

# Run Atlas migrations with explicit database URL
echo "Running Atlas migrations..."
atlas migrate apply \
  --dir "file://migrations" \
  --url "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable"

# Check if migrations succeeded
# Get exit status of last command
if [ $? -eq 0 ]; then
    echo "Atlas migrations completed successfully!"
else
    echo "Atlas migrations failed!"
    exit 1
fi

# Run the seeder
echo "Running database seeder..."
./seeder

# Start the main application
echo "Starting server..."
exec ./server