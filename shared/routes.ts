import { z } from "zod";
import { insertMessageSchema, messageSchema, type Message } from "./schema";

export const api = {
  messages: {
    list: {
      method: "GET" as const,
      path: "/api/messages",
      responses: {
        200: z.array(messageSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/messages",
      input: z.object({
        content: z.string().min(1),
      }),
      responses: {
        201: messageSchema, // Returns the AI response
        500: z.object({ message: z.string() }),
      },
    },
    clear: {
      method: "POST" as const,
      path: "/api/messages/clear",
      responses: {
        204: z.void()
      }
    }
  },
};

export type { Message };

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
