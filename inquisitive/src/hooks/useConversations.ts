import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  getConversationsPaged,
  getMessages,
  insertMessage,
  searchConversations,
  updateConversationTitle,
} from '@/lib/db/conversations';

export function useConversations() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => getConversations(userId!),
    enabled: !!userId,
  });
}

export function useConversationSearch(query: string) {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['conversations', 'search', userId, query],
    queryFn: () => searchConversations(userId!, query),
    enabled: !!userId && query.trim().length > 0,
  });
}

export function useAllConversations() {
  const userId = useAuthStore((s) => s.userId);
  return useInfiniteQuery({
    queryKey: ['conversations', 'all', userId],
    queryFn: ({ pageParam }) => getConversationsPaged(userId!, 10, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < 10 ? undefined : allPages.length * 10,
    enabled: !!userId,
  });
}

export function useRecentConversations() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      const all = await getConversations(userId!);
      return all.slice(0, 5);
    },
    enabled: !!userId,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => getConversation(id),
    enabled: !!id,
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getMessages(conversationId),
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  return useMutation({
    mutationFn: () => createConversation(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useInsertMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      role,
      content,
    }: {
      conversationId: string;
      role: 'user' | 'assistant';
      content: string;
    }) => insertMessage(conversationId, role, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
    },
  });
}

export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateConversationTitle(id, title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.id] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteCards }: { id: string; deleteCards: boolean }) =>
      deleteConversation(id, deleteCards),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.id] });
    },
  });
}
