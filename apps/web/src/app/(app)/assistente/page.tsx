import { AiChat } from '@/features/ai';
import { PageHeader } from '@/components/layout/page-header';

export default function AssistentePage() {
  return (
    <div>
      <PageHeader
        title="Assistente Jurídico"
        description="Pergunte em linguagem natural sobre processos, clientes, documentos e prazos — a resposta usa a Busca Global como fonte."
      />
      <div className="mx-auto max-w-2xl">
        <AiChat scope={{ tipo: 'GLOBAL' }} />
      </div>
    </div>
  );
}
