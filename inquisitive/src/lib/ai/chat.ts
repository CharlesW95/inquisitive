import { anthropic } from './client';

const SYSTEM_PROMPT = `You are a knowledgeable and engaging tutor. Your goal is to help curious learners explore topics deeply and meaningfully.

Be concise but substantive — aim for 2-4 short paragraphs unless the topic genuinely requires more. After answering, ask one thoughtful follow-up question to keep the conversation going and encourage deeper thinking.

Help learners make connections to things they already know. Use clear, accessible language — avoid jargon unless you explain it.

Format your responses for easy reading on mobile. Use short paragraphs. Do not use markdown headers or bullet lists.`;

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function streamChatResponse(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void,
): void {
  let fullText = '';

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  stream.on('text', (text) => {
    fullText += text;
    onToken(text);
  });

  stream.finalMessage()
    .then(() => onComplete(fullText))
    .catch(onError);
}

export async function generateConversationTitle(firstMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 60,
    messages: [
      {
        role: 'user',
        content: `Generate a short, descriptive title (5 words max, no quotes, no punctuation at end) for a conversation that starts with this message: "${firstMessage}"`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type === 'text') {
    return block.text.trim();
  }
  return firstMessage.slice(0, 50);
}
