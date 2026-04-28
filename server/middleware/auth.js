import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { user: "test" },
  "secret123",
  { expiresIn: "1h" }
);

console.log(token);