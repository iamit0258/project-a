
import { z } from "zod";

export const messageSchema = z.object({
  id: z.number(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.coerce.date().optional(),
});

export const insertMessageSchema = messageSchema.pick({
  role: true,
  content: true,
});

export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
