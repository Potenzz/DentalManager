import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { UserUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";

type SelectUser = z.infer<typeof UserUncheckedCreateInputObjectSchema>;

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret";
const JWT_EXPIRATION = "24h"; // JWT expiration time (1 day)

// Function to hash password using bcrypt
async function hashPassword(password: string) {
  const saltRounds = 10; // Salt rounds for bcrypt
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

// Function to compare passwords using bcrypt
async function comparePasswords(supplied: string, stored: string) {
  const isMatch = await bcrypt.compare(supplied, stored);
  return isMatch;
}

// Function to generate JWT
function generateToken(user: SelectUser) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

const router = express.Router();

// User registration route
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Generate a JWT token for the user after successful registration
      const token = generateToken(user);

      const { password, ...safeUser } = user;
      return res.status(201).json({ user: safeUser, token });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// User login route
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const user = await storage.getUserByUsername(req.body.username);

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const isPasswordMatch = await comparePasswords(
        req.body.password,
        user.password
      );

      if (!isPasswordMatch) {
        return res.status(401).json({ error: "Invalid password or password" });
      }

      // Generate a JWT token for the user after successful login
      const token = generateToken(user);
      const { password, ...safeUser } = user;
      return res.status(200).json({ user: safeUser, token });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Logout route (client-side action to remove the token)
router.post("/logout", (req: Request, res: Response) => {
  // For JWT-based auth, logout is handled on the client (by removing token)
  res.status(200).send("Logged out successfully");
});

export default router;
