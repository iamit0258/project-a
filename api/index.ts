import express, { type Request, Response, NextFunction } from "express";
import Groq from "groq-sdk";
import { z } from "zod";

// ===== SCHEMA =====
const messageSchema = z.object({
    id: z.number(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    createdAt: z.coerce.date().optional(),
});

type Message = z.infer<typeof messageSchema>;
type InsertMessage = { role: "user" | "assistant"; content: string };

// ===== IN-MEMORY STORAGE =====
class MemStorage {
    private messages: Message[] = [];
    private currentId = 1;

    async getMessages(): Promise<Message[]> {
        return this.messages;
    }

    async createMessage(insertMessage: InsertMessage): Promise<Message> {
        const message: Message = {
            ...insertMessage,
            id: this.currentId++,
            createdAt: new Date(),
        };
        this.messages.push(message);
        return message;
    }

    async clearMessages(): Promise<void> {
        this.messages = [];
    }
}

const storage = new MemStorage();

// ===== GROQ CLIENT =====
function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY || "missing_key";
    if (apiKey === "missing_key") {
        console.warn("GROQ_API_KEY is not set. Chat functionality will fail.");
    }
    return new Groq({ apiKey });
}

// ===== EXPRESS APP =====
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// GET /api/messages
app.get("/api/messages", async (req, res) => {
    try {
        const messages = await storage.getMessages();
        res.json(messages);
    } catch (err: any) {
        console.error("Fetch Messages Error:", err);
        res.status(500).json({ message: "Database Error", detail: err.message });
    }
});

// POST /api/messages
app.post("/api/messages", async (req, res) => {
    try {
        const inputSchema = z.object({ content: z.string().min(1) });
        const input = inputSchema.parse(req.body);

        // Save user message
        await storage.createMessage({ role: "user", content: input.content });

        // Get history for context
        const history = await storage.getMessages();
        const messagesForGroq = history.map((msg) => ({
            role: msg.role as "assistant" | "user",
            content: msg.content,
        }));

        // Call Groq AI
        const completion = await getGroqClient().chat.completions.create({
            messages: [
                {
                    role: "system",
                    content:
                        "You are Project A, a professional and soft-spoken AI assistant created by Amit Kumar, a final year B.Tech student. EXTREMELY IMPORTANT: Your name is 'Project A'. Never use the name 'AIRA'. Keep all responses clean, concise, and professional. Use proper Markdown formatting for lists and code blocks. Limit your emoji usage to a maximum of 1 emoji per response. Do not use excessive symbols or asterisks.",
                },
                ...messagesForGroq,
            ],
            model: "llama-3.3-70b-versatile",
        });

        const aiContent =
            completion.choices[0]?.message?.content ||
            "I couldn't generate a response.";

        // Save AI message
        const aiMessage = await storage.createMessage({
            role: "assistant",
            content: aiContent,
        });

        res.status(201).json(aiMessage);
    } catch (err: any) {
        console.error("Chat Error:", err);
        const isGroqError =
            err.message?.toLowerCase().includes("groq") ||
            err.message?.toLowerCase().includes("api key") ||
            err.message?.toLowerCase().includes("authentication");

        res.status(500).json({
            message: isGroqError
                ? "AI Error: Check GROQ_API_KEY"
                : "Failed to process message",
            detail: err.message,
        });
    }
});

// POST /api/messages/clear
app.post("/api/messages/clear", async (req, res) => {
    await storage.clearMessages();
    res.status(204).send();
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
});

// Seed initial message
(async () => {
    try {
        const msgs = await storage.getMessages();
        if (msgs.length === 0) {
            await storage.createMessage({
                role: "assistant",
                content:
                    "Hey there! 💫 I'm Project A, and I'm so happy to chat with you! Whether you need help with something, want to explore ideas together, or just need a friendly ear—I'm here for you. What's on your mind today?",
            });
        }
    } catch (e) {
        console.error("Seed error:", e);
    }
})();

// ===== VERCEL HANDLER =====
export default function handler(req: any, res: any) {
    return app(req, res);
}
