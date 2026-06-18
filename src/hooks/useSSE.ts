import { useRef, useCallback } from 'react';

interface SSEOptions {
  onChunk?: (text: string) => void;
  onEvent?: (event: any) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

export function useSSE() {
  const controllerRef = useRef<AbortController | null>(null);

  const startSSE = useCallback(async (url: string, body: object, options: SSEOptions) => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controllerRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        options.onError?.(err.error || 'Request failed');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              options.onDone?.();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'chunk') {
                options.onChunk?.(parsed.text);
              } else {
                options.onEvent?.(parsed);
              }
            } catch {}
          }
        }
      }
      options.onDone?.();
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        options.onError?.(error.message);
      }
    }
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  return { startSSE, abort };
}
