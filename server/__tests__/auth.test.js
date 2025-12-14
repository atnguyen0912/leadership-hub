const request = require('supertest');
const { createTestDb, initTestSchema, closeTestDb } = require('./setup');
const { generateToken, verifyToken } = require('../middleware/auth');

// Import app after setup so mocks are in place
let app;

beforeAll(async () => {
  await createTestDb();
  await initTestSchema();
  app = require('../app');
});

afterAll(async () => {
  await closeTestDb();
});

describe('Auth Middleware', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { id: 1, type: 'admin' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = { id: 1, type: 'admin' };
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(1);
      expect(decoded.type).toBe('admin');
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = verifyToken('');
      expect(decoded).toBeNull();
    });
  });
});

describe('Auth Endpoints', () => {
  describe('POST /api/auth/admin-login', () => {
    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({ password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should return token for correct password', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({ password: 'testpassword' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.type).toBe('admin');
    });
  });

  describe('POST /api/auth/student-login', () => {
    it('should return 401 for non-existent student', async () => {
      const res = await request(app)
        .post('/api/auth/student-login')
        .send({ studentId: '9999' });

      expect(res.status).toBe(401);
    });

    it('should return token for valid student', async () => {
      const res = await request(app)
        .post('/api/auth/student-login')
        .send({ studentId: 'TEST001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.type).toBe('student');
    });
  });
});

describe('Protected Routes', () => {
  it('should return 401 without auth token', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
  });

  it('should return 403 with invalid token', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(403);
  });

  it('should allow access with valid admin token', async () => {
    const token = generateToken({ id: 1, type: 'admin' });

    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${token}`);

    // 200 on success or 500 on db issues (not auth related)
    expect([200, 500]).toContain(res.status);
  });
});

describe('Admin-Only Routes', () => {
  it('should return 403 for non-admin user', async () => {
    const token = generateToken({ id: 1, type: 'student' });

    const res = await request(app)
      .get('/api/cashbox/sessions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin access required');
  });

  it('should allow admin access', async () => {
    const token = generateToken({ id: 1, type: 'admin' });

    const res = await request(app)
      .get('/api/cashbox/sessions')
      .set('Authorization', `Bearer ${token}`);

    // Should not be 401/403 (authorization errors)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
