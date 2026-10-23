const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const http = require('http');

let server;
let baseUrl;

function makeRequest(path, method, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL(path, baseUrl);
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('Authentication API Integration Test Suite', async (t) => {
  // Start server on ephemeral port for tests
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  t.after(async () => {
    server.close();
    await pool.end();
  });

  let adminToken;
  let staffToken;
  let studentToken;
  let parentToken;

  await t.test('Health check endpoint should return 200 and healthy status', async () => {
    const res = await makeRequest('/api/health', 'GET');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
  });

  await t.test('POST /api/auth/login should authenticate Admin successfully', async () => {
    const res = await makeRequest('/api/auth/login', 'POST', {
      username: 'admin',
      password: 'Admin@123',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.strictEqual(res.body.data.user.role, 'admin');
    assert.strictEqual(res.body.data.user.redirectUrl, '/admin/index.html');
    adminToken = res.body.data.token;
  });

  await t.test('POST /api/auth/login should authenticate Staff successfully', async () => {
    const res = await makeRequest('/api/auth/login', 'POST', {
      username: 'staff1',
      password: 'Staff@123',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'staff');
    assert.strictEqual(res.body.data.user.profile.employeeId, 'EMP-CSE-101');
    assert.strictEqual(res.body.data.user.redirectUrl, '/staff/index.html');
    staffToken = res.body.data.token;
  });

  await t.test('POST /api/auth/login should authenticate Student successfully', async () => {
    const res = await makeRequest('/api/auth/login', 'POST', {
      username: 'student1',
      password: 'Student@123',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'student');
    assert.strictEqual(res.body.data.user.profile.registerNumber, 'REG2023CSE001');
    assert.strictEqual(res.body.data.user.redirectUrl, '/student/index.html');
    studentToken = res.body.data.token;
  });

  await t.test('POST /api/auth/login should authenticate Parent successfully', async () => {
    const res = await makeRequest('/api/auth/login', 'POST', {
      username: 'parent1',
      password: 'Parent@123',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'parent');
    assert.strictEqual(res.body.data.user.redirectUrl, '/parent/index.html');
    parentToken = res.body.data.token;
  });

  await t.test('POST /api/auth/login should reject invalid credentials', async () => {
    const res = await makeRequest('/api/auth/login', 'POST', {
      username: 'admin',
      password: 'WrongPassword999',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Invalid username or password');
  });

  await t.test('GET /api/auth/me should return detailed profile for authenticated Student', async () => {
    const res = await makeRequest('/api/auth/me', 'GET', null, studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.username, 'student1');
    assert.strictEqual(res.body.data.user.details.registerNumber, 'REG2023CSE001');
    assert.strictEqual(res.body.data.user.details.fullName, 'Alex Turner');
  });

  await t.test('GET /api/auth/me should return linked children for authenticated Parent', async () => {
    const res = await makeRequest('/api/auth/me', 'GET', null, parentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.username, 'parent1');
    assert.ok(Array.isArray(res.body.data.user.details.children));
    assert.strictEqual(res.body.data.user.details.children.length, 1);
    assert.strictEqual(res.body.data.user.details.children[0].first_name, 'Alex');
  });

  await t.test('Protected endpoint should reject requests without token', async () => {
    const res = await makeRequest('/api/auth/me', 'GET');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Authentication token required');
  });

  t.after(() => {
    if (server) server.close();
  });
});
