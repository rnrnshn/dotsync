/**
 * Environment setup for tests
 */

// Load .env file
require('dotenv').config();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
