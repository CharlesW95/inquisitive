import { anthropic } from './client';

const SYSTEM_PROMPT = `You are a knowledgeable and engaging tutor. Your goal is to help curious learners explore topics deeply and meaningfully. Respond in Markdown. Prefer structure: use **bold** for key terms, bullet lists when enumerating factors or steps, and short paragraphs.
Use headers sparingly — only when the response is genuinely multi-part. Be concise but substantive — aim for 2–3 short paragraphs or a brief 
list unless the topic genuinely requires more. Use clear, accessible language and avoid jargon unless you explain it. Include dates of key events or people where relevant. Do NOT end your response with a question.
Follow-up questions are handled separately by the interface.`;

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
