'use client';

import * as React from 'react';
import Link from 'next/link';
import { Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAiChat } from '../api/mutations';
import type { ChatFonte, ChatScope } from '../api/ai.api';
import { AiDisclaimer } from './ai-disclaimer';
import { ThinkingIndicator } from './thinking-indicator';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  fontes?: ChatFonte[];
}

const SCOPE_LABEL: Record<ChatScope['tipo'], string> = {
  PROCESSO: 'este processo',
  DOCUMENTO: 'este documento',
  GLOBAL: 'processos, clientes, documentos e mais',
};

/**
 * Reafirma Sprint 11 §"CHAT JURÍDICO" — "estilo Copilot, não ChatGPT":
 * sempre conhece o contexto atual (`scope`), nunca pede para o usuário
 * re-explicar onde está. **Sem histórico persistido no servidor** — cada
 * pergunta é uma chamada isolada (`AiChatUseCase` é stateless); o array de
 * mensagens vive só neste componente, perdido ao recarregar a página
 * (decisão documentada em `ai-chat.use-case.ts`).
 */
export function AiChat({ scope }: { scope: ChatScope }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const chat = useAiChat();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, chat.isPending]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const pergunta = input.trim();
    if (!pergunta || chat.isPending) return;

    setMessages((prev) => [...prev, { role: 'user', content: pergunta }]);
    setInput('');

    chat.mutate(
      { escopo: scope, pergunta },
      {
        onSuccess: (result) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: result.resposta, fontes: result.fontes }]);
        },
        onError: () => {
          toast.error('Não foi possível responder agora. Tente novamente.');
        },
      },
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-border">
      <div className="flex items-center gap-2 rounded-t-lg bg-ai-subtle px-4 py-2.5">
        <Sparkles className="size-4 text-ai" aria-hidden="true" />
        <span className="text-sm font-medium text-ai">Perguntar à IA</span>
      </div>

      <div ref={scrollRef} className="scrollbar-fade max-h-80 min-h-32 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pergunte algo sobre {SCOPE_LABEL[scope.tipo]} — a resposta usa só dados reais que você tem permissão de ver.
          </p>
        )}
        {messages.map((message, index) => (
          <div key={index} className={message.role === 'user' ? 'ml-8 rounded-md bg-muted px-3 py-2' : 'mr-8 space-y-1.5'}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {message.fontes && message.fontes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {message.fontes.slice(0, 6).map((fonte, fonteIndex) =>
                  fonte.url ? (
                    <Link
                      key={fonteIndex}
                      href={fonte.url}
                      className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {fonte.titulo}
                    </Link>
                  ) : (
                    <span key={fonteIndex} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {fonte.titulo}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
        {chat.isPending && <ThinkingIndicator />}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Pergunte algo…"
          aria-label="Pergunta para o Assistente Jurídico"
          disabled={chat.isPending}
        />
        <Button type="submit" size="icon" disabled={chat.isPending || !input.trim()} aria-label="Enviar pergunta">
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </form>
      <div className="border-t border-border px-4 py-2">
        <AiDisclaimer />
      </div>
    </div>
  );
}
