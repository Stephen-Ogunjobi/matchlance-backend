# Authentication Tests

This directory contains comprehensive tests for the authentication system.

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Configure test database**:
   Add to your `.env` file:
   ```env
   TEST_MONGODB_URL=mongodb://localhost:27017/matchlance-test
   ```

   **Important**: The URL MUST contain "test" for safety - this prevents accidentally running tests against your production database.

3. **Make sure MongoDB is running**:
   ```bash
   # If using local MongoDB
   mongod

   # Or if using Docker
   docker run -d -p 27017:27017 mongo
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm test -- --watch

# Run only authentication tests
npm test -- auth.test.ts

# Run tests with coverage report
npm test -- --coverage

# Run tests in verbose mode
npm test -- --verbose
```

## Test Structure

### [auth.test.ts](auth.test.ts)
Comprehensive authentication tests covering:

- **User Registration** (`POST /signup`)
  - Valid registration
  - Missing fields validation
  - Email format validation
  - Duplicate email handling
  - Email normalization
  - Password hashing

- **User Login** (`POST /login`)
  - Successful login
  - Invalid credentials
  - Email verification check
  - Case-insensitive email
  - Token generation

- **Token Refresh** (`POST /refresh`)
  - Valid token refresh
  - Missing token handling
  - Token validation
  - Expired token handling

- **User Logout** (`POST /logout`)
  - Token cleanup
  - Database cleanup
  - Edge cases

- **Password Reset** (`POST /reset-password` and `POST /new-password`)
  - Reset email sending
  - Token generation
  - Password update
  - Token expiration
  - Validation

- **Email Verification** (`GET /verify-email`)
  - Email verification flow
  - Token validation
  - Cookie setting

- **Resend Verification** (`POST /resend-verification`)
  - Token regeneration
  - Validation checks

- **Get Current User** (`GET /me`)
  - User data retrieval
  - Authentication checks

- **Security Tests**
  - Password hashing validation
  - Password exposure prevention

## What These Tests Do

### Unit Tests
Test individual functions in isolation:
- Password hashing
- Email validation
- Token generation

### Integration Tests
Test how components work together:
- Database operations
- Authentication flow
- Token management

### API Tests
Test complete HTTP request/response:
- All auth endpoints
- Status codes
- Response data
- Error handling

## Test Coverage

Run `npm test -- --coverage` to see:
- Lines covered
- Functions covered
- Branches covered
- Statements covered

Aim for >80% coverage on critical paths.

## Writing New Tests

Follow this pattern:

```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup before each test
    await User.deleteMany({});
  });

  it('should do something specific', async () => {
    // Arrange: Set up test data
    const req = createMockReq({ email: 'test@example.com' });
    const res = createMockRes();

    // Act: Execute the function
    await postLogin(req as any, res as any);

    // Assert: Verify the results
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Login Successful',
      })
    );
  });
});
```

## Mocking

External services are mocked to avoid:
- Sending real emails during tests
- Making actual API calls
- Incurring costs

See mocks at the top of [auth.test.ts](auth.test.ts):
- Email services (SendGrid)
- User cache (Redis)

## Troubleshooting

### Tests fail to connect to database
- Make sure MongoDB is running
- Check `TEST_MONGODB_URL` in `.env`
- Ensure URL contains "test"

### Tests timeout
- Increase timeout in `jest.config.js`
- Check if MongoDB is responsive
- Look for network issues

### Tests fail randomly
- Tests may be depending on each other
- Ensure `beforeEach` properly cleans up
- Check for race conditions

### TypeScript errors
- Run `npm install` to ensure all types are installed
- Check `tsconfig.test.json` is valid

## Best Practices

1. **Test one thing per test** - Each test should verify a single behavior
2. **Use descriptive names** - Test name should explain what it does
3. **Keep tests independent** - Tests should not depend on each other
4. **Clean up after tests** - Use `beforeEach`/`afterEach` to reset state
5. **Test edge cases** - Don't just test the happy path
6. **Mock external dependencies** - Don't send real emails or hit real APIs

## Next Steps

Add tests for:
- [ ] Job posting functionality
- [ ] Freelancer profiles
- [ ] Proposals
- [ ] Chat system
- [ ] File uploads
