const bcrypt = require('bcryptjs');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

/**
 * Hash a plain text password using bcrypt
 * @param {string} plainPassword 
 * @returns {Promise<string>}
 */
const hashPassword = async (plainPassword) => {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plainPassword, salt);
};

/**
 * Compare plain text password with stored bcrypt hash
 * @param {string} plainPassword 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
const comparePassword = async (plainPassword, hash) => {
  if (!plainPassword || !hash) {
    return false;
  }
  return bcrypt.compare(plainPassword, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
