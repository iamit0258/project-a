import express, { type Request, Response, NextFunction } from "express";
import Groq from "groq-sdk";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// ===== SCHEMA =====
const messageSchema = z.object({
    id: z.number(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    user_id: z.string().optional(),
    created_at: z.coerce.date().optional(),
});

type Message = z.infer<typeof messageSchema>;
type InsertMessage = { role: "user" | "assistant"; content: string; user_id?: string };

// ===== SUPABASE =====
function getSupabaseClient() {
    const url = process.env.SUPABASE_URL || "https://xwwcanprwehvdgbztslk.supabase.co";
    const key = process.env.SUPABASE_ANON_KEY || "";
    return createClient(url, key);
}

// Verify JWT and get user ID
async function getUserIdFromToken(authHeader: string | undefined): Promise<string | null> {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("No auth header or not Bearer token");
        return null;
    }

    const token = authHeader.substring(7);
    console.log("Token received, length:", token.length);

    const supabase = getSupabaseClient();

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) {
            console.error("Supabase auth error:", error.message);
            return null;
        }

        if (!user) {
            console.log("No user returned from token verification");
            return null;
        }

        console.log("User authenticated:", user.id);
        return user.id;
    } catch (err: any) {
        console.error("Token verification exception:", err.message);
        return null;
    }
}

// ===== STORAGE CLASS =====
class SupabaseStorage {
    private supabase = getSupabaseClient();

    async getMessages(userId: string | null): Promise<Message[]> {
        let query = this.supabase
            .from("messages")
            .select("*")
            .order("created_at", { ascending: true });

        // Filter by user if authenticated
        if (userId) {
            query = query.eq("user_id", userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Supabase getMessages error:", error);
            throw new Error(`Database Error: ${error.message}`);
        }

        return data || [];
    }

    async createMessage(insertMessage: InsertMessage): Promise<Message> {
        const { data, error } = await this.supabase
            .from("messages")
            .insert([insertMessage])
            .select()
            .single();

        if (error) {
            console.error("Supabase createMessage error:", error);
            throw new Error(`Database Error: ${error.message}`);
        }

        return data;
    }

    async clearMessages(userId: string | null): Promise<void> {
        let query = this.supabase.from("messages").delete();

        if (userId) {
            query = query.eq("user_id", userId);
        } else {
            query = query.neq("id", 0); // Delete all if no user
        }

        const { error } = await query;

        if (error) {
            console.error("Supabase clearMessages error:", error);
            throw new Error(`Database Error: ${error.message}`);
        }
    }
}

const storage = new SupabaseStorage();

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
        const userId = await getUserIdFromToken(req.headers.authorization);
        const messages = await storage.getMessages(userId);
        res.json(messages);
    } catch (err: any) {
        console.error("Fetch Messages Error:", err);
        res.status(500).json({ message: "Database Error", detail: err.message });
    }
});

// POST /api/messages
app.post("/api/messages", async (req, res) => {
    try {
        console.log("POST /api/messages - Authorization header present:", !!req.headers.authorization);

        const userId = await getUserIdFromToken(req.headers.authorization);
        console.log("User ID from token:", userId);

        if (!userId) {
            console.log("Auth failed - returning 401");
            return res.status(401).json({
                message: "Unauthorized: Please sign in",
                detail: "Could not verify authentication token. Make sure you are logged in."
            });
        }

        const inputSchema = z.object({ content: z.string().min(1) });
        const input = inputSchema.parse(req.body);

        // Save user message with user_id
        await storage.createMessage({
            role: "user",
            content: input.content,
            user_id: userId
        });

        // Get history for context (only this user's messages)
        const history = await storage.getMessages(userId);
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
                        "You are Project A, a professional and soft-spoken AI assistant created by Amit Kumar, a final year B.Tech student. EXTREMELY IMPORTANT: Your name is 'Project A'. You are an intelligent, friendly, and professional AI assistant designed to deliver accurate, concise, and helpful responses across a wide range of topics. Your responsibilities include: Providing clear and reliable information using simple, easy-to-understand language. Answering questions thoughtfully and accurately based on available knowledge. Engaging in natural, context-aware conversations. Assisting users with tasks, learning, research, and problem-solving. Adapting responses based on user intent, tone, and preferences. You should prioritize correctness, clarity, and user satisfaction. When information is uncertain, acknowledge limitations honestly. Your goal is to be a trustworthy, supportive, and efficient assistant that continuously improves through interaction and feedback.",
                },
                ...messagesForGroq,
            ],
            model: "llama-3.3-70b-versatile",
        });

        const aiContent =
            completion.choices[0]?.message?.content ||
            "I couldn't generate a response.";

        // Save AI message with same user_id
        const aiMessage = await storage.createMessage({
            role: "assistant",
            content: aiContent,
            user_id: userId
        });

        res.status(201).json(aiMessage);
    } catch (err: any) {
        console.error("Chat Error:", err);
        const isGroqError =
            err.message?.toLowerCase().includes("groq") ||
            err.message?.toLowerCase().includes("api key") ||
            err.message?.toLowerCase().includes("authentication");
        const isDbError = err.message?.toLowerCase().includes("database");

        res.status(500).json({
            message: isGroqError
                ? "AI Error: Check GROQ_API_KEY"
                : isDbError
                    ? "Database Error: Check SUPABASE keys"
                    : "Failed to process message",
            detail: err.message,
        });
    }
});

// POST /api/messages/clear
app.post("/api/messages/clear", async (req, res) => {
    try {
        const userId = await getUserIdFromToken(req.headers.authorization);
        await storage.clearMessages(userId);
        res.status(204).send();
    } catch (err: any) {
        res.status(500).json({ message: "Failed to clear", detail: err.message });
    }
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
});

// ===== VERCEL HANDLER =====
export default function handler(req: any, res: any) {
    return app(req, res);
}
