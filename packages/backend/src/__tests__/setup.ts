// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://kite:postgres@localhost:5432/issuesdb_test';
process.env.LOG_LEVEL = 'error';
process.env.PORT = '3001';
