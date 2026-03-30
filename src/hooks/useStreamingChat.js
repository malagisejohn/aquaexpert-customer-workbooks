import { useCallback } from 'react';

const parseSseLine = (line) => {
  if (!line.startsWith('data: ')) return null;

  const data = line.slice(6);
  if (data === '[DONE]') return null;

  try {
    return JSON.parse(data);
  } catch (error) {
    if (error.message !== 'Unexpected end of JSON input') {
      console.error('Parse error:', error);
    }
    return null;
  }
};

export default function useStreamingChat() {
  const streamChatCompletion = useCallback(async ({ payload, token, onContent }) => {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Stream request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let streamedContent = '';
    let pending = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() || '';

      for (const line of lines) {
        const parsed = parseSseLine(line);
        if (!parsed) continue;
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.content) {
          streamedContent += parsed.content;
        }
        onContent?.(streamedContent, parsed);
      }
    }

    if (pending) {
      const parsed = parseSseLine(pending.trim());
      if (parsed?.error) throw new Error(parsed.error);
      if (parsed) {
        if (parsed.content) {
          streamedContent += parsed.content;
        }
        onContent?.(streamedContent, parsed);
      }
    }

    return streamedContent;
  }, []);

  return { streamChatCompletion };
}
