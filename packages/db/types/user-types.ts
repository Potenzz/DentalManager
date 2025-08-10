
import { UserUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import {z} from "zod";

export type User = z.infer<typeof UserUncheckedCreateInputObjectSchema>;

export const insertUserSchema = (
  UserUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).pick({
  username: true,
  password: true,
});

export const loginSchema = (insertUserSchema as unknown as z.ZodObject<any>).extend({
  rememberMe: z.boolean().optional(),
});

export const registerSchema = (insertUserSchema as unknown as z.ZodObject<any>)
  .extend({
    confirmPassword: z.string().min(6, {
      message: "Password must be at least 6 characters long",
    }),
    agreeTerms: z.literal(true, {
      errorMap: () => ({
        message: "You must agree to the terms and conditions",
      }),
    }),
  })
  .refine((data: any) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;