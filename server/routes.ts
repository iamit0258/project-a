
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import Groq from "groq-sdk";
import { spawn } from "child_process";

// Initialize Groq client
// Initialize Groq client lazily
let groqInstance: Groq | null = null;

function getGroqClient() {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY || "missing_key";
    if (apiKey === "missing_key") {
      console.warn("GROQ_API_KEY is not set. Chat functionality will fail.");
    }
    groqInstance = new Groq({
      apiKey,
    });
  }
  return groqInstance;
}

import { createClient } from "@supabase/supabase-js";

// Helper to get Supabase client
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || "https://xwwcanprwehvdgbztslk.supabase.co";
  const key = process.env.SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// Verify JWT and get user ID
async function getUserIdFromToken(req: any): Promise<string | null> {
  // Check for Voice Secret (Local bypass)
  const voiceSecret = req.headers["x-voice-secret"];
  const voiceUserId = req.headers["x-user-id"];
  if (voiceSecret === "project-a-voice-secret-123" && voiceUserId) {
    return voiceUserId as string;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.messages.list.path, async (req, res) => {
    try {
      const userId = await getUserIdFromToken(req);
      const messages = await storage.getMessages(userId);
      res.json(messages);
    } catch (err: any) {
      console.error("Fetch Messages Error:", err);
      res.status(500).json({ message: "Database Error: Could not fetch messages", detail: err.message });
    }
  });

  app.post(api.messages.create.path, async (req, res) => {
    try {
      // 1. Get User ID
      const userId = await getUserIdFromToken(req);

      const input = api.messages.create.input.parse(req.body);
      const skipAi = (req.body as any).skip_ai === true;

      // 2. Save User Message
      await storage.createMessage({
        role: "user",
        content: input.content,
        userId: userId || undefined
      });

      // If skip_ai is true, stop here
      if (skipAi) {
        res.status(201).json({ role: "user", content: input.content });
        return;
      }

      // 3. Generate AI Response using Groq (Llama 3.3)
      const history = await storage.getMessages(userId);

      const messagesForGroq = history.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user" as any,
        content: msg.content
      }));

      const completion = await getGroqClient().chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are Project A, a professional AI assistant. EXTREMELY IMPORTANT: Respond with ULTIMATE BREVITY. For voice mode, you MUST respond in EXACTLY ONE SHORT SENTENCE (under 15 words) whenever possible. Never use lists or long explanations. Be direct and concise. Your goal is speed and conversational efficiency."
          },
          ...messagesForGroq
        ],
        model: "llama-3.3-70b-versatile",
      });

      const aiContent = completion.choices[0]?.message?.content || "I couldn't generate a response.";

      // 4. Save AI Message
      const aiMessage = await storage.createMessage({
        role: "assistant",
        content: aiContent,
        userId: userId || undefined
      });

      res.status(201).json(aiMessage);
    } catch (err: any) {
      const isGroqError = err.message?.toLowerCase().includes("groq") || err.message?.toLowerCase().includes("api key") || err.message?.toLowerCase().includes("authentication");

      let userMessage = "Failed to process chat message";
      if (isGroqError) userMessage = "AI Error: Please verify your GROQ_API_KEY in Vercel settings.";

      console.error("Chat Error Detail:", {
        message: err.message,
        stack: err.stack,
        isGroqError
      });
      res.status(500).json({
        message: userMessage,
        detail: err.message
      });
    }
  });

  app.post(api.messages.clear.path, async (req, res) => {
    const userId = await getUserIdFromToken(req);
    await storage.clearMessages(userId);
    res.status(204).send();
  });

  // Seed data
  try {
    const existingMessages = await storage.getMessages(null);
    if (existingMessages.length === 0) {
      // Seed is tricky with user_id... only seed for null user? 
      // For now, only seed if NO messages at all exist
      await storage.createMessage({
        role: "assistant",
        content: "Hey there! 💫 I'm Project A, and I'm so happy to chat with you! Whether you need help with something, want to explore ideas together, or just need a friendly ear—I'm here for you. What's on your mind today?"
      });
    }
  } catch (seedError: any) {
    console.error("Failed to seed data:", seedError.message);
    // Continue anyway so the server can at least start and provide more diagnostics
  }

  // Voice Assistant Route
  app.post("/api/voice/start", async (req, res) => {
    // Get user ID

    // Get user ID
    const userId = await getUserIdFromToken(req);

    // Check if running already? For simplicity, we just launch it.
    // Ideally we might track pids, but for local use this is fine.

    // We use 'npm run voice' or 'python' directly. 
    // Using 'cmd /c start' on Windows to open in a new window so user can interact/see status 
    const isWindows = process.platform === "win32";
    const command = isWindows ? "cmd" : "python";
    const args = isWindows
      ? ["/c", "start", "python", "python_assistant/assistant.py"]
      : ["python_assistant/assistant.py"];

    // Set ENV vars for the child process
    const env = {
      ...process.env,
      USER_ID: userId || ""
    };

    try {
      const subprocess = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        env
      });
      subprocess.unref(); // Allow server to keep running independently

      res.status(200).json({ message: "Voice assistant started" });
    } catch (e: any) {
      console.error("Voice Launch Error:", e);
      res.status(500).json({ message: "Failed to launch voice assistant", error: e.message });
    }
  });

  // ElevenLabs TTS Proxy
  app.post("/api/voice/tts", async (req, res) => {
    const { text } = req.body;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error("TTS Error: ELEVENLABS_API_KEY is missing");
      return res.status(500).json({ message: "ElevenLabs API Key not configured" });
    }

    try {
      // Voice: Rachel (American, Expressive, Female)
      const voiceId = "21m00Tcm4TlvDq8ikWAM";
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2", // Upgraded model for better quality
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`ElevenLabs API Error: ${response.status} ${response.statusText}`);
      }

      // Stream the audio back
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`TTS Success: Generated ${buffer.length} bytes of audio`);

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length
      });
      res.send(buffer);

    } catch (e: any) {
      console.error("TTS Server-side Exception:", e);
      res.status(500).json({ message: "TTS Generation Failed", detail: e.message });
    }
  });

  return httpServer;
}
