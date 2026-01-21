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

// GET /api/messages
export function useMessages() {
  return useQuery({
    queryKey: [api.messages.list.path],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(api.messages.list.path, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.messages.list.responses[200].parse(await res.json());
    },
  });
}

// POST /api/messages
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(api.messages.create.path, {
        method: api.messages.create.method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        try {
          const error = await res.json();
          throw new Error(error.message || "Failed to send message");
        } catch {
          throw new Error("Failed to send message");
        }
      }

      return api.messages.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
    },
  });
}

// Clear messages (frontend only - keeps messages in database)
export function useClearMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Only clear frontend cache, don't delete from database
      // This allows users to "start fresh" without losing history
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.setQueryData([api.messages.list.path], []);
    },
  });
}
