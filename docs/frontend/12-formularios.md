# 12 — Formulários

## 12.1 Base (reafirma `docs/04-arquitetura-frontend.md §4.5`)

React Hook Form + Zod via `zodResolver` — o **mesmo** schema Zod valida o
formulário e tipa o payload de envio. Papel distinto dos tipos gerados do
OpenAPI, já esclarecido em [09-openapi.md §9.2](09-openapi.md).

- Validação `onBlur` no primeiro preenchimento de cada campo; `onChange`
  depois que o campo já errou uma vez (não grita com o usuário enquanto
  ele ainda digita, reafirma `docs/ux/14-ux-writing.md`).
- Wizards multi-etapa (cadastro de processo) usam um schema Zod por etapa
  + um schema composto (`z.intersection`/merge) validado no submit final —
  cada etapa é navegável independentemente sem forçar o preenchimento de
  campos de etapas futuras.

## 12.2 Mapeamento de erro `422` para campo

```ts
// Resposta RFC 9457: { fieldErrors: [{ field: 'numeroCnj', code: 'INVALID_CHECK_DIGIT', message: '...' }] }
onError: (error: ApiError) => {
  error.fieldErrors?.forEach(({ field, message }) =>
    form.setError(field as Path<FormValues>, { type: 'server', message })
  );
},
```

`field` no `fieldErrors` do backend usa o mesmo nome camelCase do schema
Zod do frontend **quando o formulário expõe aquele campo diretamente**;
quando não expõe (ex.: erro em um campo calculado/derivado), o erro é
mostrado como banner de formulário genérico em vez de tentar mapear para
um campo inexistente na UI.

## 12.3 Validação assíncrona

Único caso real nesta etapa: verificação de duplicidade de CPF/CNPJ ao
cadastrar cliente (`docs/ux/08-clientes.md`) — **não bloqueante**: o aviso
de possível duplicidade aparece como banner inline após o campo perder
foco (debounce 400ms), com link "ver cadastro existente", mas nunca
impede o `Salvar` (reafirma a decisão de UX já registrada: duplicidade é
aviso, não erro de validação).

## 12.4 Autosave — só onde já documentado, não um padrão geral

Autosave com debounce de 2s existe **apenas** no formulário de cadastro de
processo (wizard longo, `docs/04 §4.5`) — persiste rascunho contra o
backend (não `localStorage`, reafirma
[11-estado-global.md §11.3](11-estado-global.md)) para sobreviver a um
fechamento acidental de aba. Formulários curtos (cliente rápido, convite
de membro, comentário) não têm autosave — o custo de implementar e testar
persistência de rascunho não se paga para um formulário que leva menos de
30 segundos para preencher.

## 12.5 Dirty state e confirmação ao sair

Todo formulário usa `form.formState.isDirty` para acionar o guard de
navegação do Next.js (`useBeforeUnload` + interceptação de navegação
client-side) — "Você tem alterações não salvas. Deseja sair mesmo assim?"
— exceto o wizard de processo (§12.4), que já persiste via autosave e por
isso não precisa desse guard (o rascunho não se perde).

## 12.6 Normalização e máscaras (`lib/validators/`)

| Campo | Normalização | Validação |
|---|---|---|
| CPF | Remove pontuação para armazenar, máscara `000.000.000-00` para exibir | Dígito verificador (algoritmo padrão), reaproveitado do mesmo validador do backend (mesma regra, implementações independentes — nenhuma chamada de rede só para validar dígito) |
| CNPJ | Idem | Idem |
| Número CNJ | `0000000-00.0000.0.00.0000` | Máscara de dígitos + validação de dígito verificador (mesmo algoritmo do backend) |
| Moeda | Formatação `pt-BR` (`R$ 1.234,56`), armazenado como centavos (inteiro) — nunca float | — |
| Datas | `date-fns` com locale `pt-BR`, sempre exibida `DD/MM/AAAA` | Data futura obrigatória em prazo, data passada obrigatória em data de distribuição, etc. — regra por campo, não genérica |
| Telefone | Máscara BR (fixo/celular) | Formato, não existência real |

## 12.7 Padrões de campo compostos

- **Select assíncrono / autocomplete** (Cliente, Tag, Usuário): componente
  `ClientPicker`/`TagPicker`/`UserPicker` (catálogo em
  [13-design-system.md §13.5](13-design-system.md)) — debounce 300ms,
  busca via query própria (não reaproveita a Busca Global), "Criar novo"
  inline quando o backend permite criação a partir do contexto do
  formulário (Cliente a partir do formulário de Processo).
- **Upload dentro de formulário** (ex.: anexar documento ao criar
  processo): usa o mesmo fluxo de presign/confirm de
  [18-documents-folders.md §18.2](18-documents-folders.md), não um upload
  "simplificado" paralelo.
- **Tags:** `TagPicker` com criação inline, mesma tela de qualquer
  contexto (processo, documento, cliente).
- **Participantes/responsáveis:** `UserPicker`/`ClientPicker` restrito ao
  escopo do escritório ativo (a busca dentro do picker já é
  implicitamente escopada pelo `officeId` da chave de query, reafirma
  [10-tanstack-query.md §10.2](10-tanstack-query.md)).

## 12.8 Acessibilidade de formulário

Todo campo com erro usa `aria-invalid="true"` + `aria-describedby`
apontando para o texto de erro (reafirma
[24-accessibility.md §24.2](24-accessibility.md)); label sempre associado
via `htmlFor`/`id`, nunca só placeholder como label.

---

**Anterior:** [11-estado-global.md](11-estado-global.md) · **Próximo:** [13-design-system.md](13-design-system.md)
