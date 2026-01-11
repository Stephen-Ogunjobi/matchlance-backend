import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/users.js';
import {
  postSignup,
  postLogin,
  postRefresh,
  postLogout,
  postResetPassword,
  postNewPassword,
  verifyEmail,
  resendVerificationEmail,
  getCurrentUser,
} from '../controllers/auth.js';

dotenv.config();

// Mock email services
jest.mock('../utils/emailServices.js', () => ({
  generateToken: jest.fn(() => 'mock-token-123'),
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// Mock user cache
jest.mock('../utils/userCache.js', () => ({
  getCachedUser: jest.fn((userId: string) => User.findById(userId)),
  invalidateUserCached: jest.fn(),
}));

// Helper to create mock request/response
const createMockReq = (body = {}, cookies = {}, query = {}, user?: any) => ({
  body,
  cookies,
  query,
  user,
});

const createMockRes = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

describe('Authentication System', () => {
  beforeAll(async () => {
    const testDbUrl = process.env.TEST_MONGODB_URL;
    if (!testDbUrl) {
      throw new Error('TEST_MONGODB_URL is not set in .env file');
    }
    await mongoose.connect(testDbUrl);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear all users before each test
    await User.deleteMany({});
  });

  describe('POST /signup - User Registration', () => {
    it('should register a new user with valid data', async () => {
      const req = createMockReq({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        role: 'freelancer',
      });
      const res = createMockRes();

      await postSignup(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Signup successful'),
          user: expect.objectContaining({
            email: 'john@example.com',
            role: 'freelancer',
            isEmailVerified: false,
          }),
        })
      );

      // Verify user was created in database
      const user = await User.findOne({ email: 'john@example.com' });
      expect(user).toBeTruthy();
      expect(user?.firstName).toBe('John');
      expect(user?.lastName).toBe('Doe');
      expect(user?.password).not.toBe('SecurePass123!'); // Should be hashed
    });

    it('should return 400 if required fields are missing', async () => {
      const req = createMockReq({
        firstName: 'John',
        // Missing lastName, email, password
      });
      const res = createMockRes();

      await postSignup(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'All fields are required',
      });
    });

    it('should return 400 for invalid email format', async () => {
      const req = createMockReq({
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'SecurePass123!',
      });
      const res = createMockRes();

      await postSignup(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Please enter a valid email address',
      });
    });

    it('should return 409 if email already exists', async () => {
      // Create existing user
      await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: await bcrypt.hash('password', 10),
        isEmailVerified: true,
      });

      const req = createMockReq({
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'SecurePass123!',
      });
      const res = createMockRes();

      await postSignup(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email already registered',
      });
    });

    it('should normalize email to lowercase and capitalize names', async () => {
      const req = createMockReq({
        firstName: 'john',
        lastName: 'doe',
        email: 'JOHN@EXAMPLE.COM',
        password: 'SecurePass123!',
      });
      const res = createMockRes();

      await postSignup(req as any, res as any);

      const user = await User.findOne({ email: 'john@example.com' });
      expect(user?.email).toBe('john@example.com');
      expect(user?.firstName).toBe('John');
      expect(user?.lastName).toBe('Doe');
    });

    it('should store hashed password, not plain text', async () => {
      const req = createMockReq({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
      });
      const res = createMockRes();

      await postSignup(req as any, res as any);

      const user = await User.findOne({ email: 'john@example.com' });
      expect(user?.password).not.toBe('SecurePass123!');

      // Verify password can be compared
      const isMatch = await bcrypt.compare('SecurePass123!', user?.password || '');
      expect(isMatch).toBe(true);
    });
  });

  describe('POST /login - User Login', () => {
    beforeEach(async () => {
      // Create a verified user for login tests
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: true,
      });
    });

    it('should login successfully with correct credentials', async () => {
      const req = createMockReq({
        email: 'test@example.com',
        password: 'Password123!',
      });
      const res = createMockRes();

      await postLogin(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login Successful',
          user: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );

      // Verify cookies were set
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(String),
        expect.any(Object)
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return 404 if user does not exist', async () => {
      const req = createMockReq({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      });
      const res = createMockRes();

      await postLogin(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 400 for incorrect password', async () => {
      const req = createMockReq({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      });
      const res = createMockRes();

      await postLogin(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Incorrect password' });
    });

    it('should return 403 if email is not verified', async () => {
      // Create unverified user
      await User.create({
        firstName: 'Unverified',
        lastName: 'User',
        email: 'unverified@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: false,
      });

      const req = createMockReq({
        email: 'unverified@example.com',
        password: 'Password123!',
      });
      const res = createMockRes();

      await postLogin(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Please verify your email before logging in',
        emailNotVerified: true,
      });
    });

    it('should handle case-insensitive email login', async () => {
      const req = createMockReq({
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123!',
      });
      const res = createMockRes();

      await postLogin(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login Successful',
        })
      );
    });

    it('should store refresh token in database', async () => {
      const req = createMockReq({
        email: 'test@example.com',
        password: 'Password123!',
      });
      const res = createMockRes();

      await postLogin(req as any, res as any);

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user?.refreshToken).toBeTruthy();
      expect(typeof user?.refreshToken).toBe('string');
    });
  });

  describe('POST /refresh - Token Refresh', () => {
    let validRefreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and generate valid refresh token
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: true,
      });
      userId = user._id.toString();

      const secret = process.env.JWT_REFRESH_SECRET || 'test-secret';
      validRefreshToken = jwt.sign({ userId: user._id }, secret, { expiresIn: '7d' });

      user.refreshToken = validRefreshToken;
      await user.save();
    });

    it('should refresh access token with valid refresh token', async () => {
      const req = createMockReq({}, { refreshToken: validRefreshToken });
      const res = createMockRes();

      await postRefresh(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token refreshed successfully',
      });
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return 401 if refresh token is missing', async () => {
      const req = createMockReq({}, {});
      const res = createMockRes();

      await postRefresh(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token not found' });
    });

    it('should return 403 if refresh token does not match database', async () => {
      const differentToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET || 'test-secret',
        { expiresIn: '7d' }
      );

      const req = createMockReq({}, { refreshToken: differentToken });
      const res = createMockRes();

      await postRefresh(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Token' });
    });

    it('should return 500 for invalid/expired token', async () => {
      const req = createMockReq({}, { refreshToken: 'invalid-token' });
      const res = createMockRes();

      await postRefresh(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });
  });

  describe('POST /logout - User Logout', () => {
    it('should logout and clear tokens', async () => {
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: true,
        refreshToken: 'some-refresh-token',
      });

      const req = createMockReq({}, { refreshToken: 'some-refresh-token' });
      const res = createMockRes();

      await postLogout(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
      expect(res.clearCookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(Object)
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(Object)
      );

      // Verify refresh token was removed from database
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.refreshToken).toBeNull();
    });

    it('should handle logout when no refresh token exists', async () => {
      const req = createMockReq({}, {});
      const res = createMockRes();

      await postLogout(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });

    it('should handle logout when user not found', async () => {
      const req = createMockReq({}, { refreshToken: 'non-existent-token' });
      const res = createMockRes();

      await postLogout(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });
  });

  describe('POST /reset-password - Password Reset Request', () => {
    beforeEach(async () => {
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: true,
      });
    });

    it('should send password reset email for existing user', async () => {
      const req = createMockReq({ email: 'test@example.com' });
      const res = createMockRes();

      await postResetPassword(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password rest email sent',
        })
      );

      // Verify reset token was stored
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user?.resetPasswordToken).toBeTruthy();
      expect(user?.resetPasswordExpires).toBeTruthy();
    });

    it('should return 400 if email is missing', async () => {
      const req = createMockReq({});
      const res = createMockRes();

      await postResetPassword(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email is required' });
    });

    it('should return generic success message for non-existent user (security)', async () => {
      const req = createMockReq({ email: 'nonexistent@example.com' });
      const res = createMockRes();

      await postResetPassword(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'If an account exists, a password reset email has been sent',
      });
    });
  });

  describe('POST /new-password - Set New Password', () => {
    let resetToken: string;

    beforeEach(async () => {
      resetToken = 'valid-reset-token';
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: await bcrypt.hash('OldPassword123!', 10),
        isEmailVerified: true,
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });
    });

    it('should reset password with valid token', async () => {
      const req = createMockReq({
        token: resetToken,
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });
      const res = createMockRes();

      await postNewPassword(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password successfully change',
      });

      // Verify password was changed
      const user = await User.findOne({ email: 'test@example.com' });
      const isMatch = await bcrypt.compare('NewPassword123!', user?.password || '');
      expect(isMatch).toBe(true);

      // Verify reset token was cleared
      expect(user?.resetPasswordToken).toBeNull();
      expect(user?.resetPasswordExpires).toBeNull();
    });

    it('should return 400 if required fields are missing', async () => {
      const req = createMockReq({
        token: resetToken,
        // Missing passwords
      });
      const res = createMockRes();

      await postNewPassword(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing fields' });
    });

    it('should return 400 if passwords do not match', async () => {
      const req = createMockReq({
        token: resetToken,
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      });
      const res = createMockRes();

      await postNewPassword(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password doesnt match' });
    });

    it('should return 400 for invalid or expired token', async () => {
      const req = createMockReq({
        token: 'invalid-token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });
      const res = createMockRes();

      await postNewPassword(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid or expired reset token',
      });
    });

    it('should return 400 for expired token', async () => {
      // Create user with expired token
      await User.deleteMany({});
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'expired@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: true,
        resetPasswordToken: 'expired-token',
        resetPasswordExpires: new Date(Date.now() - 1000), // Expired
      });

      const req = createMockReq({
        token: 'expired-token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });
      const res = createMockRes();

      await postNewPassword(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid or expired reset token',
      });
    });
  });

  describe('GET /verify-email - Email Verification', () => {
    let verificationToken: string;

    beforeEach(async () => {
      verificationToken = 'valid-verification-token';
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    it('should verify email with valid token', async () => {
      const req = createMockReq({}, {}, { token: verificationToken });
      const res = createMockRes();

      await verifyEmail(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email verified successfully!',
          user: expect.objectContaining({
            isEmailVerified: true,
          }),
        })
      );

      // Verify in database
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user?.isEmailVerified).toBe(true);
      expect(user?.emailVerificationToken).toBeNull();
      expect(user?.emailVerificationExpires).toBeNull();
    });

    it('should return 400 if token is missing', async () => {
      const req = createMockReq({}, {}, {});
      const res = createMockRes();

      await verifyEmail(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Verification token required',
      });
    });

    it('should return 400 for invalid token', async () => {
      const req = createMockReq({}, {}, { token: 'invalid-token' });
      const res = createMockRes();

      await verifyEmail(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired verification token',
      });
    });

    it('should set auth cookies after verification', async () => {
      const req = createMockReq({}, {}, { token: verificationToken });
      const res = createMockRes();

      await verifyEmail(req as any, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(String),
        expect.any(Object)
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('POST /resend-verification - Resend Verification Email', () => {
    it('should resend verification email for unverified user', async () => {
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: false,
      });

      const req = createMockReq({ email: 'test@example.com' });
      const res = createMockRes();

      await resendVerificationEmail(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Verification email sent successfully',
      });

      // Verify new token was generated
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user?.emailVerificationToken).toBeTruthy();
      expect(user?.emailVerificationExpires).toBeTruthy();
    });

    it('should return 400 if email is missing', async () => {
      const req = createMockReq({});
      const res = createMockRes();

      await resendVerificationEmail(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email is required' });
    });

    it('should return 404 if user not found', async () => {
      const req = createMockReq({ email: 'nonexistent@example.com' });
      const res = createMockRes();

      await resendVerificationEmail(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 400 if email already verified', async () => {
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'verified@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: true,
      });

      const req = createMockReq({ email: 'verified@example.com' });
      const res = createMockRes();

      await resendVerificationEmail(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already verified' });
    });
  });

  describe('GET /me - Get Current User', () => {
    it('should return user data for authenticated user', async () => {
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: true,
      });

      const req = createMockReq({}, {}, {}, { userId: user._id.toString() });
      const res = createMockRes();

      await getCurrentUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        }),
      });
    });

    it('should return 404 if userId is missing', async () => {
      const req = createMockReq({}, {}, {}, {});
      const res = createMockRes();

      await getCurrentUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 404 if user does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const req = createMockReq({}, {}, {}, { userId: fakeId });
      const res = createMockRes();

      await getCurrentUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  describe('Password Security', () => {
    it('should properly hash passwords with bcrypt', async () => {
      const password = 'SecurePassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(20);
      expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
      expect(await bcrypt.compare('WrongPassword', hashedPassword)).toBe(false);
    });

    it('should not expose passwords in responses', async () => {
      const req = createMockReq({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
      });
      const res = createMockRes();

      await postSignup(req as any, res as any);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.user?.password).toBeUndefined();
    });
  });
});
