import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Message } from "@shared/routes";

// GET /api/messages
export function useMessages() {
  return useQuery({
    queryKey: [api.messages.list.path],
    queryFn: async () => {
      const res = await fetch(api.messages.list.path);
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
      // Validate input client-side using shared schema logic if possible, 
      // or just trust the API types here since we're sending simple JSON.
      const res = await fetch(api.messages.create.path, {
        method: api.messages.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        // Try to parse error if available
        try {
          const error = await res.json();
          throw new Error(error.message || "Failed to send message");
        } catch (e) {
          throw new Error("Failed to send message");
        }
      }

      return api.messages.create.responses[201].parse(await res.json());
    },
    onSuccess: (newAiMessage) => {
      // Invalidate to refresh the full list, or optimistically update if we want complex logic.
      // Since we get the AI response back, refreshing is safest to ensure sync.
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
    },
  });
}

// POST /api/messages/clear (UI-only)
export function useClearMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Modified: Only clear UI, keep messages in server storage
      // We skip the fetch(api.messages.clear.path) call
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.setQueryData([api.messages.list.path], []);
    },
  });
}
