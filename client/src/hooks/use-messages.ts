import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Message } from "@shared/routes";
import { supabase } from "@/lib/supabase";

// Helper to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

// Configurable API base for web & Android container
function getApiUrl(path: string): string {
  const base = (typeof window !== "undefined" && (window as any).__ORBIT_API_BASE__) || import.meta.env.VITE_API_URL || "";
  return `${base}${path}`;
}

// GET /api/messages
export function useMessages() {
  return useQuery({
    queryKey: [api.messages.list.path],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(getApiUrl(api.messages.list.path), {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const json = await res.json();
      try {
        return api.messages.list.responses[200].parse(json);
      } catch (err) {
        console.warn("Message parsing warning, falling back to raw list:", err);
        return Array.isArray(json) ? json : [];
      }
    },
  });
}

// POST /api/messages
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const authHeaders = await getAuthHeaders();

      // Optimistically add user message to cache immediately
      const userMessage: Message = {
        id: Date.now(), // Temporary ID
        role: "user",
        content,
        createdAt: new Date(),
      };

      const currentMessages = queryClient.getQueryData<Message[]>([api.messages.list.path]) || [];
      queryClient.setQueryData([api.messages.list.path], [...currentMessages, userMessage]);

      const res = await fetch(getApiUrl(api.messages.create.path), {
        method: api.messages.create.method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to send message";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          } else {
            const text = await res.text();
            errorMessage = text || errorMessage;
          }
        } catch (e) {
          console.error("Error parsing response:", e);
        }
        throw new Error(errorMessage);
      }

      return api.messages.create.responses[201].parse(await res.json());
    },
    onSuccess: (aiResponse) => {
      // Append AI response to current cache (don't refetch from DB)
      const currentMessages = queryClient.getQueryData<Message[]>([api.messages.list.path]) || [];
      queryClient.setQueryData([api.messages.list.path], [...currentMessages, aiResponse]);
    },
  });
}

// Clear messages (permanently from database)
export function useClearMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(getApiUrl(api.messages.clear.path), {
        method: api.messages.clear.method,
        headers: {
          ...authHeaders,
        },
      });
      if (!res.ok) throw new Error("Failed to clear messages");
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.setQueryData([api.messages.list.path], []);
      // Invalidate query to ensure we don't have stale data if re-fetched
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
    },
  });
}
