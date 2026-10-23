const test = require('node:test');
const assert = require('node:assert');
const { hashPassword, comparePassword } = require('../src/utils/passwordHelper');
const jwt = require('jsonwebtoken');

test('Password Hashing and Verification Suite', async (t) => {
  await t.test('should correctly hash password with bcrypt', async () => {
    const plain = 'StrongPassword@2026';
    const hash = await hashPassword(plain);
    assert.strictEqual(typeof hash, 'string');
    assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'));
  });

  await t.test('should verify correct password against hash', async () => {
    const plain = 'AcademicSecure#456';
    const hash = await hashPassword(plain);
    const isValid = await comparePassword(plain, hash);
    assert.strictEqual(isValid, true);
  });

  await t.test('should reject incorrect password', async () => {
    const plain = 'CorrectPassword@1';
    const wrong = 'WrongPassword@1';
    const hash = await hashPassword(plain);
    const isValid = await comparePassword(wrong, hash);
    assert.strictEqual(isValid, false);
  });

  await t.test('should reject empty or null password comparisons safely', async () => {
    const isValid = await comparePassword('', 'somehash');
    assert.strictEqual(isValid, false);
    const isValidNull = await comparePassword(null, null);
    assert.strictEqual(isValidNull, false);
  });
});

test('JWT Authentication and Role-Based Authorization Token Suite', async (t) => {
  const secret = 'test_jwt_secret_token_nextgen_2026';

  await t.test('should generate and verify valid JWT token with user role payload', () => {
    const payload = {
      userId: 1,
      username: 'admin',
      role: 'admin',
    };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);

    assert.strictEqual(decoded.userId, 1);
    assert.strictEqual(decoded.username, 'admin');
    assert.strictEqual(decoded.role, 'admin');
  });

  await t.test('should reject expired tokens', () => {
    const payload = { userId: 2, role: 'staff' };
    const token = jwt.sign(payload, secret, { expiresIn: '-1s' }); // expired

    assert.throws(() => {
      jwt.verify(token, secret);
    }, (err) => {
      return err.name === 'TokenExpiredError';
    });
  });

  await t.test('should reject tampered or corrupted token signature', () => {
    const payload = { userId: 3, role: 'student' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const tampered = token.slice(0, -5) + 'abcde';

    assert.throws(() => {
      jwt.verify(tampered, secret);
    }, (err) => {
      return err.name === 'JsonWebTokenError';
    });
  });

  await t.test('should enforce role boundaries (Staff vs Student vs Admin vs Parent)', () => {
    const allowedRoles = ['admin', 'staff'];
    const studentUser = { role: 'student' };
    const staffUser = { role: 'staff' };
    const parentUser = { role: 'parent' };

    assert.strictEqual(allowedRoles.includes(studentUser.role), false);
    assert.strictEqual(allowedRoles.includes(parentUser.role), false);
    assert.strictEqual(allowedRoles.includes(staffUser.role), true);
  });
});
