import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEV_USER_ID } from '@/constants/dev';
import {
  createConversation,
  getConversation,
  getConversations,
  getMessages,
  insertMessage,
  updateConversationTitle,
} from '@/lib/db/conversations';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations', DEV_USER_ID],
    queryFn: () => getConversations(DEV_USER_ID),
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
