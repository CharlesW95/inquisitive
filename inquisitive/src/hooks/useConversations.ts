import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEV_USER_ID } from '@/constants/dev';
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
  return useQuery({
    queryKey: ['conversations', DEV_USER_ID],
    queryFn: () => getConversations(DEV_USER_ID),
  });
}

export function useConversationSearch(query: string) {
  return useQuery({
    queryKey: ['conversations', 'search', DEV_USER_ID, query],
    queryFn: () => searchConversations(DEV_USER_ID, query),
    enabled: query.trim().length > 0,
  });
}

export function useAllConversations() {
  return useInfiniteQuery({
    queryKey: ['conversations', 'all', DEV_USER_ID],
    queryFn: ({ pageParam }) => getConversationsPaged(DEV_USER_ID, 10, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < 10 ? undefined : allPages.length * 10,
  });
}

export function useRecentConversations() {
  return useQuery({
    queryKey: ['conversations', DEV_USER_ID],
    queryFn: async () => {
      const all = await getConversations(DEV_USER_ID);
      return all.slice(0, 5);
    },
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
  return useMutation({
    mutationFn: () => createConversation(DEV_USER_ID),
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
