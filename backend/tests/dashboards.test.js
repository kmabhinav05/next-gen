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
    const headers = { 'Content-Type': 'application/json' };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = new URL(path, baseUrl);
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
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

test('Dashboards & Academic Role Endpoints Integration Suite', async (t) => {
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

  // Login tokens
  let adminToken, staffToken, studentToken, parentToken;

  await t.test('Acquire role tokens', async () => {
    const [adminLogin, staffLogin, studentLogin, parentLogin] = await Promise.all([
      makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'Admin@123' }),
      makeRequest('/api/auth/login', 'POST', { username: 'staff1', password: 'Staff@123' }),
      makeRequest('/api/auth/login', 'POST', { username: 'student1', password: 'Student@123' }),
      makeRequest('/api/auth/login', 'POST', { username: 'parent1', password: 'Parent@123' }),
    ]);

    assert.strictEqual(adminLogin.status, 200);
    assert.strictEqual(staffLogin.status, 200);
    assert.strictEqual(studentLogin.status, 200);
    assert.strictEqual(parentLogin.status, 200);

    adminToken = adminLogin.body.data.token;
    staffToken = staffLogin.body.data.token;
    studentToken = studentLogin.body.data.token;
    parentToken = parentLogin.body.data.token;
  });

  await t.test('Admin should fetch system stats successfully', async () => {
    const res = await makeRequest('/api/admin/stats', 'GET', null, adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.totalStudents >= 3);
    assert.ok(res.body.data.totalStaff >= 2);
    assert.ok(res.body.data.totalSubjects >= 4);
  });

  await t.test('Non-admin should be forbidden from accessing admin endpoints', async () => {
    const res = await makeRequest('/api/admin/stats', 'GET', null, studentToken);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Staff should fetch their assigned courses and timetable', async () => {
    const res = await makeRequest('/api/staff/dashboard', 'GET', null, staffToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.assignedCourses));
    assert.ok(res.body.data.assignedCourses.length > 0);
  });

  await t.test('Student should fetch their academic marks and attendance breakdown', async () => {
    const res = await makeRequest('/api/student/dashboard', 'GET', null, studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.student.register_number, 'REG2023CSE001');
    assert.ok(Array.isArray(res.body.data.subjects));
    assert.ok(res.body.data.academicSummary.overallAttendance > 0);
  });

  await t.test('Parent should fetch linked ward details', async () => {
    const res = await makeRequest('/api/parent/dashboard', 'GET', null, parentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.children));
    assert.strictEqual(res.body.data.selectedChild.first_name, 'Alex');
    assert.ok(Array.isArray(res.body.data.subjects));
  });

  await t.test('Parent cannot access records of unlinked students', async () => {
    // Attempt to access student ID 2 (Bella Chen) which is not linked to parent1 (Robert Turner)
    const res = await makeRequest('/api/parent/dashboard?studentId=2', 'GET', null, parentToken);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });
});
