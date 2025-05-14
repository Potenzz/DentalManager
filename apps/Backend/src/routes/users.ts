import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { UserUncheckedCreateInputObjectSchema } from "@repo/db/shared/schemas";

const router = Router();

// Type based on shared schema
type SelectUser = z.infer<typeof UserUncheckedCreateInputObjectSchema>;

// Zod validation
const userCreateSchema = UserUncheckedCreateInputObjectSchema;
const userUpdateSchema = (UserUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>).partial();


router.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).send("Unauthorized UserId");

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).send("User not found");


    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to fetch user");
  }
});

// GET: User by ID
router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const idParam = req.params.id;
    if (!idParam) return res.status(400).send("User ID is required");

    const id = parseInt(idParam);
    if (isNaN(id)) return res.status(400).send("Invalid user ID");

    const user = await storage.getUser(id);
    if (!user) return res.status(404).send("User not found");

    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to fetch user");
  }
});

// POST: Create new user
router.post("/", async (req: Request, res: Response) => {
  try {
    const input = userCreateSchema.parse(req.body);
    const newUser = await storage.createUser(input);
    const { password, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid user data", details: err });
  }
});

// PUT: Update user
router.put("/:id", async (req: Request, res: Response):Promise<any> => {
  try {
    const idParam = req.params.id;
    if (!idParam) return res.status(400).send("User ID is required");

    const id = parseInt(idParam);
    if (isNaN(id)) return res.status(400).send("Invalid user ID");


    const updates = userUpdateSchema.parse(req.body);
    const updatedUser = await storage.updateUser(id, updates);
    if (!updatedUser) return res.status(404).send("User not found");

    const { password, ...safeUser } = updatedUser;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid update data", details: err });
  }
});

// DELETE: Delete user
router.delete("/:id", async (req: Request, res: Response):Promise<any> => {
  try {
    const idParam = req.params.id;
    if (!idParam) return res.status(400).send("User ID is required");

    const id = parseInt(idParam);
    if (isNaN(id)) return res.status(400).send("Invalid user ID");

    const success = await storage.deleteUser(id);
    if (!success) return res.status(404).send("User not found");

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to delete user");
  }
});

export default router;