import { InsertUser, User } from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IUsersStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUsers(limit: number, offset: number): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
}

export const usersStorage: IUsersStorage = {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.user.findUnique({ where: { id } });
    return user ?? undefined;
  },

  async getUsers(limit: number, offset: number): Promise<User[]> {
    return await db.user.findMany({ skip: offset, take: limit });
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await db.user.findUnique({ where: { username } });
    return user ?? undefined;
  },

  async createUser(user: InsertUser): Promise<User> {
    return await db.user.create({ data: user as User });
  },

  async updateUser(
    id: number,
    updates: Partial<User>
  ): Promise<User | undefined> {
    try {
      return await db.user.update({ where: { id }, data: updates });
    } catch {
      return undefined;
    }
  },

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
