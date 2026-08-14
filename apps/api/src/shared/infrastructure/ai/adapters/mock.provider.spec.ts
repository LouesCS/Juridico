import { MockAiProvider } from './mock.provider';

describe('MockAiProvider', () => {
  const provider = new MockAiProvider();

  it('healthCheck sempre retorna true (nenhuma dependência externa)', async () => {
    expect(await provider.healthCheck()).toBe(true);
  });

  it('gera conteúdo determinístico a partir dos campos do contexto', async () => {
    const result = await provider.generate({
      messages: [
        { role: 'system', content: 'Você é um assistente jurídico.' },
        {
          role: 'user',
          content: 'Título: Ação Trabalhista — Silva\nCliente: Roberto Almeida\nStatus: ATIVO',
        },
      ],
    });

    expect(result.content).toContain('Ação Trabalhista — Silva');
    expect(result.content).toContain('Roberto Almeida');
    expect(result.modelo).toBe('mock-v1');
    expect(result.tokensEntrada).toBeGreaterThan(0);
    expect(result.tokensSaida).toBeGreaterThan(0);
  });

  it('responde a uma pergunta livre buscando linhas relevantes do contexto', async () => {
    const result = await provider.generate({
      messages: [
        {
          role: 'user',
          content:
            'Título: Ação Trabalhista\nPróximo prazo: Contestação em 2026-08-10\nPergunta: Quando é o próximo prazo?',
        },
      ],
    });

    expect(result.content).toContain('Contestação');
  });

  it('generateStream emite deltas incrementais cujo texto concatenado é igual ao de generate()', async () => {
    const request = { messages: [{ role: 'user' as const, content: 'Título: Processo X' }] };
    const full = await provider.generate(request);

    let concatenado = '';
    const stream = provider.generateStream(request);
    let next = await stream.next();
    while (!next.done) {
      concatenado += next.value.delta;
      next = await stream.next();
    }

    expect(concatenado.trim()).toBe(full.content.trim());
    expect(next.value.modelo).toBe('mock-v1');
  });

  it('nunca deixa uma resposta parecer definitiva/sem indicação de ser um mock', async () => {
    const result = await provider.generate({ messages: [{ role: 'user', content: 'Título: X' }] });
    expect(result.content.toLowerCase()).toContain('modo de demonstração');
  });
});
