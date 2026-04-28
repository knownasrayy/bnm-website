import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev_secret';

export function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '1d' });
}