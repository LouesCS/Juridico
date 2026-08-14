'use client';

import * as React from 'react';
import { Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { clientsApi, type ClientSummaryDTO } from '@/features/clients/api/clients.api';
import { RemotePicker } from '@/features/extrajudicial-movements/components/extrajudicial-movement-filters';
import { useCaseParties } from '../api/queries';
import { useUpdateExtrajudicialAggregate } from '../api/mutations';
import type { CasePartyDTO, LegalCaseDetailDTO, LegalCaseStatus } from '../api/legal-cases.api';

const STATUS: Array<[LegalCaseStatus, string]> = [
  ['ATIVO', 'Em andamento'],
  ['SUSPENSO', 'Suspenso'],
  ['ARQUIVADO', 'Arquivado'],
  ['ENCERRADO', 'Encerrado'],
];
const OTHER_ROLES = [
  ['TERCEIRO_INTERESSADO', 'Terceiro interessado'],
  ['ASSISTENTE', 'Assistente'],
  ['MINISTERIO_PUBLICO', 'Ministério Público'],
  ['TESTEMUNHA', 'Testemunha'],
  ['PERITO', 'Perito'],
  ['ADVOGADO_EXTERNO', 'Advogado externo'],
  ['JUIZ', 'Juiz'],
  ['PROMOTOR', 'Promotor'],
  ['REPRESENTANTE_LEGAL', 'Representante legal'],
  ['OUTRO', 'Outro'],
] as const;
type DraftParty = Pick<CasePartyDTO, 'id' | 'clienteId' | 'nome' | 'tipo'> & {
  principal: boolean;
  draftKey: string;
};
const day = (value: string | null) => value?.slice(0, 10) ?? '';

export function ExtrajudicialLegalCaseForm({
  legalCase,
  onSaved,
}: {
  legalCase: LegalCaseDetailDTO;
  onSaved: () => void;
}) {
  const mutation = useUpdateExtrajudicialAggregate(legalCase.id);
  const query = useCaseParties(legalCase.id);
  const [parties, setParties] = React.useState<DraftParty[]>([]);
  const [initialized, setInitialized] = React.useState(false);
  const [error, setError] = React.useState('');
  const [values, setValues] = React.useState({
    protocolo: legalCase.numeroInterno ?? '',
    instituicao: legalCase.instituicao ?? '',
    entrada: day(legalCase.dataDistribuicao),
    conclusao: day(legalCase.dataEncerramento),
    status: legalCase.status,
    observacoes: legalCase.observacoes ?? '',
    numeroBeneficio: legalCase.numeroBeneficio ?? '',
  });
  React.useEffect(() => {
    if (!initialized && query.data) {
      setParties(
        query.data.map((p) => ({
          id: p.id,
          clienteId: p.clienteId,
          nome: p.nome,
          tipo: p.tipo,
          principal: Boolean(p.principal),
          draftKey: p.id,
        })),
      );
      setInitialized(true);
    }
  }, [initialized, query.data]);
  const invalidDates = Boolean(
    values.entrada && values.conclusao && values.conclusao < values.entrada,
  );
  const autores = parties.filter((p) => p.tipo === 'AUTOR');
  const reus = parties.filter((p) => p.tipo === 'REU');
  const outras = parties.filter((p) => !['AUTOR', 'REU'].includes(p.tipo));
  const validPrincipals =
    autores.filter((p) => p.principal).length === 1 && reus.filter((p) => p.principal).length === 1;
  const missing = !values.protocolo.trim() || !values.entrada || !validPrincipals;
  const change = (name: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const setMain = (key: string, role: 'AUTOR' | 'REU') => {
    // O Select do Radix mantém um <select> nativo oculto para integração com
    // formulários; ao sincronizar programaticamente o valor controlado ele
    // pode disparar onValueChange('') antes de suas <option>s serem
    // registradas. Uma chave vazia nunca corresponde a uma seleção real do
    // usuário, então é ignorada para não zerar o principal já carregado.
    if (!key) return;
    setParties((current) =>
      current.map((p) => (p.tipo === role ? { ...p, principal: p.draftKey === key } : p)),
    );
  };
  const remove = (party: DraftParty) => {
    if (party.principal) {
      setError(
        `Escolha outro ${party.tipo === 'AUTOR' ? 'Requerente' : 'Requerido'} principal antes de removê-lo.`,
      );
      return;
    }
    setError('');
    setParties((current) => current.filter((p) => p.draftKey !== party.draftKey));
  };
  const add = (client: ClientSummaryDTO, tipo: string) => {
    if (parties.some((p) => p.clienteId === client.id && p.tipo === tipo)) {
      setError('Esta pessoa já possui este papel no Processo.');
      return;
    }
    setError('');
    setParties((current) => [
      ...current,
      {
        draftKey: `new:${client.id}:${tipo}`,
        id: '',
        clienteId: client.id,
        nome: client.nome,
        tipo,
        principal: false,
      },
    ]);
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (missing || invalidDates) return;
    try {
      await mutation.mutateAsync({
        versaoAtual: legalCase.versao,
        input: {
          processo: {
            numeroInterno: values.protocolo.trim(),
            instituicao: values.instituicao.trim() || null,
            dataDistribuicao: values.entrada,
            dataEncerramento: values.conclusao || null,
            status: values.status,
            observacoes: values.observacoes.trim() || null,
            numeroBeneficio: values.numeroBeneficio.trim() || null,
          },
          partes: parties.map((p) => ({
            ...(p.id ? { id: p.id } : { clienteId: p.clienteId }),
            tipo: p.tipo,
            principal: p.principal,
          })),
        },
      });
      toast.success('Processo extrajudicial atualizado.');
      onSaved();
    } catch {
      toast.error('Não foi possível atualizar o processo. Nenhuma alteração foi aplicada.');
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <section className="space-y-4">
        <h3 className="font-semibold">Dados principais</h3>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Protocolo *">
            <Input
              value={values.protocolo}
              onChange={(e) => change('protocolo', e.target.value)}
              maxLength={40}
            />
          </Field>
          <Field label="Instituição">
            <Input
              value={values.instituicao}
              onChange={(e) => change('instituicao', e.target.value)}
              maxLength={200}
            />
          </Field>
          <Field label="Data de entrada *">
            <Input
              type="date"
              value={values.entrada}
              onChange={(e) => change('entrada', e.target.value)}
            />
          </Field>
          <Field label="Data de conclusão">
            <Input
              type="date"
              value={values.conclusao}
              onChange={(e) => change('conclusao', e.target.value)}
            />
            {invalidDates && (
              <InlineError>
                A data de conclusão não pode ser anterior à data de entrada.
              </InlineError>
            )}
          </Field>
          <Field label="Situação">
            <Select value={values.status} onValueChange={(v) => change('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Anotações">
          <Textarea
            rows={5}
            value={values.observacoes}
            onChange={(e) => change('observacoes', e.target.value)}
            maxLength={4000}
          />
          <p className="text-right text-xs text-muted-foreground">
            {values.observacoes.length} / 4.000 caracteres
          </p>
        </Field>
      </section>
      <PartySection
        title="Requerente"
        role="AUTOR"
        items={autores}
        onMain={(key) => setMain(key, 'AUTOR')}
        onRemove={remove}
        onAdd={add}
      />
      <PartySection
        title="Requerido"
        role="REU"
        items={reus}
        onMain={(key) => setMain(key, 'REU')}
        onRemove={remove}
        onAdd={add}
      />
      <OtherParties items={outras} onRemove={remove} onAdd={add} />
      <section className="space-y-2">
        <h3 className="font-semibold">Campos extras</h3>
        <div className="sm:max-w-sm">
          <Field label="Número do Benefício">
            <Input
              value={values.numeroBeneficio}
              onChange={(e) => change('numeroBeneficio', e.target.value)}
              maxLength={80}
            />
          </Field>
        </div>
      </section>
      {(error || missing) && (
        <InlineError>
          {error ||
            'Informe Protocolo, Data de entrada, Requerente principal e Requerido principal.'}
        </InlineError>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={missing || invalidDates || mutation.isPending || query.isLoading}
        >
          Salvar
        </Button>
      </div>
    </form>
  );
}

function PartySection({
  title,
  role,
  items,
  onMain,
  onRemove,
  onAdd,
}: {
  title: string;
  role: 'AUTOR' | 'REU';
  items: DraftParty[];
  onMain: (key: string) => void;
  onRemove: (p: DraftParty) => void;
  onAdd: (c: ClientSummaryDTO, t: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <Field label={`${title} principal *`}>
        <Select value={items.find((p) => p.principal)?.draftKey ?? ''} onValueChange={onMain}>
          <SelectTrigger className="min-w-0">
            <SelectValue placeholder={`Selecione o ${title.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {items.map((p) => (
              <SelectItem key={p.draftKey} value={p.draftKey}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {items.find((p) => p.principal) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onRemove(items.find((p) => p.principal)!)}
          >
            Remover {title.toLowerCase()} principal
          </Button>
        )}
      </Field>
      <Label>Outros {title.toLowerCase()}s</Label>
      <PartyList items={items.filter((p) => !p.principal)} onMain={onMain} onRemove={onRemove} />
      <ClientAdder
        label={`Adicionar ${title.toLowerCase()}`}
        queryKey={role}
        onAdd={(client) => onAdd(client, role)}
      />
    </section>
  );
}
function OtherParties({
  items,
  onRemove,
  onAdd,
}: {
  items: DraftParty[];
  onRemove: (p: DraftParty) => void;
  onAdd: (c: ClientSummaryDTO, t: string) => void;
}) {
  const [role, setRole] = React.useState('');
  const [selected, setSelected] = React.useState<ClientSummaryDTO | null>(null);
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Outras partes envolvidas</h3>
      <PartyList items={items} onRemove={onRemove} />
      <div className="grid min-w-0 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <ClientPicker label="Pessoa" queryKey="other" onSelected={setSelected} />
        <Field label="Tipo de participação *">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o papel" />
            </SelectTrigger>
            <SelectContent>
              {OTHER_ROLES.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button
          type="button"
          variant="outline"
          disabled={!selected || !role}
          onClick={() => {
            if (selected && role) {
              onAdd(selected, role);
              setSelected(null);
              setRole('');
            }
          }}
        >
          Adicionar
        </Button>
      </div>
    </section>
  );
}
function PartyList({
  items,
  onMain,
  onRemove,
}: {
  items: DraftParty[];
  onMain?: (key: string) => void;
  onRemove: (p: DraftParty) => void;
}) {
  return (
    <div className="space-y-2">
      {items.length ? (
        items.map((p) => (
          <div
            key={p.draftKey}
            className="flex min-w-0 items-center gap-2 rounded-md border px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate" title={p.nome}>
              {p.nome}
            </span>
            {p.principal && (
              <span className="flex shrink-0 items-center gap-1 text-xs">
                <Star className="size-3" /> Principal
              </span>
            )}
            {onMain && !p.principal && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onMain(p.draftKey)}>
                Definir como principal
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Remover ${p.nome}`}
              onClick={() => onRemove(p)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma parte vinculada.</p>
      )}
    </div>
  );
}
function ClientAdder({
  label,
  queryKey,
  onAdd,
}: {
  label: string;
  queryKey: string;
  onAdd: (c: ClientSummaryDTO) => void;
}) {
  const [selected, setSelected] = React.useState<ClientSummaryDTO | null>(null);
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <ClientPicker label={label} queryKey={queryKey} onSelected={setSelected} />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={!selected}
        onClick={() => {
          if (selected) {
            onAdd(selected);
            setSelected(null);
          }
        }}
      >
        Adicionar
      </Button>
    </div>
  );
}
function ClientPicker({
  label,
  queryKey,
  onSelected,
}: {
  label: string;
  queryKey: string;
  onSelected: (c: ClientSummaryDTO | null) => void;
}) {
  const [value, setValue] = React.useState('');
  const cache = React.useRef(new Map<string, ClientSummaryDTO>());
  return (
    <RemotePicker
      label={label}
      placeholder="Pesquisar por nome ou documento"
      value={value}
      onChange={(id) => {
        setValue(id);
        onSelected(cache.current.get(id) ?? null);
      }}
      queryKey={`extrajudicial-party-${queryKey}`}
      load={async (q, cursor) => {
        const r = await clientsApi.list({
          q,
          cursor: typeof cursor === 'string' ? cursor : undefined,
          limit: 25,
        });
        r.items.forEach((x) => cache.current.set(x.id, x));
        return {
          items: r.items.map((x) => ({
            id: x.id,
            title: x.nome,
            details: [
              x.documento ?? '',
              x.tipo === 'PESSOA_FISICA' ? 'Pessoa física' : 'Pessoa jurídica',
            ],
          })),
          next: r.nextCursor,
        };
      }}
    />
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  );
}
