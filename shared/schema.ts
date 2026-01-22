
import { z } from "zod";

export const messageSchema = z.object({
  id: z.number(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  userId: z.string().optional(), // Using camelCase for TS, mapped to snake_case in Supabase if needed, or just keep simple
  createdAt: z.coerce.date().optional(),
});

export const insertMessageSchema = messageSchema.pick({
  role: true,
  content: true,
  userId: true,
});

export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
