#!/bin/bash
set -e

# Wait for the database to be ready (with timeout)
MAX_RETRIES=30
RETRY_COUNT=0
echo "Waiting for database connection..."
until nc -z ${DB_HOST:-db} ${DB_PORT:-5432} || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  echo "Waiting for database... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Database connection timed out after $MAX_RETRIES attempts"
  exit 1
fi

echo "Database is ready!"

# Working directory is already /opt/app-root/src
cd packages/backend

# Always run migrations to ensure schema is up to date
echo "Running database migrations"
npx prisma migrate deploy

# Conditionally seed the database only in development mode
# and only if the database is empty
if [[ "$NODE_ENV" == "development" ]]; then
  echo "Checking if database needs seeding..."

  # Use psql directly to check if table has records
  # Continue script even if this fails
  set +e
  RECORD_COUNT=$(PGPASSWORD=${POSTGRES_PASSWORD:-postgres} psql -h ${DB_HOST:-db} -U ${POSTGRES_USER:-kite} -d ${POSTGRES_DB:-issuesdb} -t -c "SELECT COUNT(*) FROM \"Issue\";" 2>/dev/null || echo "0")
  # Stop script on failures now
  set -e

  # Take the record count we got, delete extra spaces from DB output
  RECORD_COUNT=$(echo $RECORD_COUNT | tr -d ' ')

  # Check if the coutn is exactly zero or if it's not a number
  if [[ $RECORD_COUNT == "0" ]] || [[ ! $RECORD_COUNT =~ ^[0-9]+$ ]]; then
    echo "Seeding the database... (count was: $RECORD_COUNT)"
    npx prisma db seed
  else
    echo "Database already has data ($RECORD_COUNT records), skipping seed"
  fi
fi

# Start the application
echo "Starting application..."
# Run whatever is set for CMD in the Containerfile
exec "$@"
