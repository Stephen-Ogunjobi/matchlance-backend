import { beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Global setup - runs once before all test files
// Note: Test timeout is configured in jest.config.js
beforeAll(async () => {
  // Ensure we're using test database
  const testDbUrl = process.env.TEST_MONGODB_URL;
  if (!testDbUrl) {
    throw new Error('TEST_MONGODB_URL environment variable is not set');
  }

  if (!testDbUrl.includes('test')) {
    throw new Error('TEST_MONGODB_URL must contain "test" in the name for safety');
  }

  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

// Global teardown - runs once after all test files
afterAll(async () => {
  // Close mongoose connection after all tests
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
