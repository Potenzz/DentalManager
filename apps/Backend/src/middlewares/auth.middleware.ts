import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'; // Secret used for signing JWTs

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void{

  // Check the Authorization header for the Bearer token
  const token = req.header('Authorization')?.split(' ')[1]; // Extract token from Authorization header

  if (!token) {
    res.status(401).send("Access denied. No token provided.");
    return;
  }

  // Verify JWT
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send("Forbidden. Invalid token.");
    }

    // Attach the decoded user data to the request object
    req.user = decoded as Express.User;
    next(); // Proceed to the next middleware or route handler
  });
}
