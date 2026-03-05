import express, { type Request, Response, NextFunction } from "express";
import Groq from "groq-sdk";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
function getSupabaseClient(token?: string) {
    const url = process.env.SUPABASE_URL || "https://xwwcanprwehvdgbztslk.supabase.co";
    const key = process.env.SUPABASE_ANON_KEY || "";

    const options = token
        ? { global: { headers: { Authorization: token } } }
        : {};

    return createClient(url, key, options);
}

// Verify JWT and get user ID using the client
async function getUser(supabase: SupabaseClient): Promise<string | null> {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.log("Auth check: specific user not found or error", error?.message);
            return null;
        }

        return user.id;
    } catch (err: any) {
        console.error("Token verification exception:", err.message);
        return null;
    }
}

// ===== STORAGE CLASS =====
class SupabaseStorage {

    async getMessages(client: SupabaseClient, userId: string | null): Promise<Message[]> {
        let query = client
            .from("messages")
            .select("*")
            .eq("is_archived", false)
            .order("created_at", { ascending: true });

        // Filter by user if authenticated
        // Note: If RLS is on, this might be redundant but safe
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

    async createMessage(client: SupabaseClient, insertMessage: InsertMessage): Promise<Message> {
        const { data, error } = await client
            .from("messages")
            .insert([{
                ...insertMessage,
                is_archived: false // Explicitly set for production consistency
            }])
            .select()
            .single();

        if (error) {
            console.error("Supabase createMessage error:", error);
            throw new Error(`Database Error: ${error.message}`);
        }

        return data;
    }

    async clearMessages(client: SupabaseClient, userId: string | null): Promise<void> {
        // Change from DELETE to UPDATE (Soft Delete)
        let query = client.from("messages").update({ is_archived: true });

        if (userId) {
            query = query.eq("user_id", userId);
        } else {
            // CAUTION: This updates everything if no user is authenticated and RLS permits
            console.warn("Attempting to clear ALL messages (no user scope)");
            query = query.neq("id", 0);
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
        const token = req.headers.authorization;
        const supabase = getSupabaseClient(token);
        const userId = await getUser(supabase);

        const messages = await storage.getMessages(supabase, userId);
        res.json(messages);
    } catch (err: any) {
        console.error("Fetch Messages Error:", err);
        res.status(500).json({ message: "Database Error", detail: err.message });
    }
});

// POST /api/messages
app.post("/api/messages", async (req, res) => {
    try {
        // Authenticate
        const token = req.headers.authorization;
        const supabase = getSupabaseClient(token);
        const userId = await getUser(supabase);

        const inputSchema = z.object({ content: z.string().min(1) });
        const input = inputSchema.parse(req.body);

        // Save user message
        await storage.createMessage(supabase, {
            role: "user",
            content: input.content,
            user_id: userId || undefined
        });

        // Get history for context
        const history = await storage.getMessages(supabase, userId);
        const messagesForGroq = history.map((msg) => ({
            role: msg.role as "assistant" | "user",
            content: msg.content,
        }));

        // Define identity and few-shot examples
        const now = new Date();
        const dateTimeStr = now.toLocaleString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true
        });

        const fewShotExamples = [
            { role: "user", content: "Who created you?" },
            { role: "assistant", content: "I was created by Amit Kumar, a final year B.Tech student." },
            { role: "user", content: "What is your name?" },
            { role: "assistant", content: "My name is Project A - AI powered voice assistant." }
        ];

        // Call Groq AI
        const completion = await getGroqClient().chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are Project A - AI powered voice assistant.
Today is ${dateTimeStr}.
You were created by Amit Kumar, a final year B.Tech student.
Be professional, direct, and helpful. 
Modify your response length based on the user's request.`,
                },
                ...fewShotExamples.map(ex => ({ role: ex.role as "user" | "assistant", content: ex.content })),
                ...messagesForGroq,
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, // Consistency for identity
        });

        const aiContent =
            completion.choices[0]?.message?.content ||
            "I couldn't generate a response.";

        // Save AI message
        const aiMessage = await storage.createMessage(supabase, {
            role: "assistant",
            content: aiContent,
            user_id: userId || undefined
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
                    ? `Database Error: ${err.message}` // Show actual error message
                    : "Failed to process message",
            detail: err.message,
        });
    }
});

// POST /api/messages/clear
app.post("/api/messages/clear", async (req, res) => {
    try {
        const token = req.headers.authorization;
        const supabase = getSupabaseClient(token);
        const userId = await getUser(supabase);

        await storage.clearMessages(supabase, userId);
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

