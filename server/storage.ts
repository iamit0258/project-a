import { type Message, type InsertMessage } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

export interface IStorage {
  getMessages(userId?: string | null): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearMessages(userId?: string | null): Promise<void>;
}

// Supabase client
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || "https://xwwcanprwehvdgbztslk.supabase.co";
  const key = process.env.SUPABASE_ANON_KEY || "";

  if (!key) {
    console.warn("SUPABASE_ANON_KEY not set - using empty key");
  }

  return createClient(url, key);
}

export class SupabaseStorage implements IStorage {
  private supabase = getSupabaseClient();

  async getMessages(userId?: string | null): Promise<Message[]> {
    let query = this.supabase
      .from("messages")
      .select("*")
      .neq("is_archived", true) // Filter out archived messages
      .order("created_at", { ascending: true });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase getMessages error:", error);
      throw new Error(`Database Error: ${error.message}`);
    }

    // Map to expected Message format
    return (data || []).map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      userId: msg.user_id,
      createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
      isArchived: msg.is_archived
    }));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const { data, error } = await this.supabase
      .from("messages")
      .insert([{
        role: insertMessage.role,
        content: insertMessage.content,
        user_id: insertMessage.userId, // Map camel to snake for DB
        is_archived: false // Default to false
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase createMessage error:", error);
      throw new Error(`Database Error: ${error.message}`);
    }

    return {
      id: data.id,
      role: data.role,
      content: data.content,
      userId: data.user_id,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      isArchived: data.is_archived
    };
  }

  async clearMessages(userId?: string | null): Promise<void> {
    // Perform Soft Delete (Archive)
    let query = this.supabase.from("messages").update({ is_archived: true });

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.neq("id", 0);
    }

    const { error } = await query;

    if (error) {
      console.error("Supabase clearMessages error:", error);
      throw new Error(`Database Error: ${error.message}`);
    }
  }
}

export const storage = new SupabaseStorage();
