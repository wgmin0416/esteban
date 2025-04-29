const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

// 해싱
const hashValue = async (plainText) => {
  const hashedValue = await bcrypt.hash(plainText, SALT_ROUNDS);
  return hashedValue;
};

// 해시 비교
const compareHash = async (plainText, hashedValue) => {
  const compareResult = await bcrypt.compare(plainText, hashedValue);
  return compareResult;
};

module.exports = { hashValue, compareHash };
