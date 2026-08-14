# 07 — Tela de Documentos

> Reafirma [../03-fluxos-e-telas.md §3.5](../03-fluxos-e-telas.md),
> [../08-especificacao-modulos.md §8.3](../08-especificacao-modulos.md) e
> entidades de [../database/05-entidades-documentos-colaboracao.md](../database/05-entidades-documentos-colaboracao.md).

## 7.1 Upload

Botão "+ Enviar documento" abre seletor de arquivo nativo **e** a área
inteira da lista aceita arrastar-e-soltar simultaneamente — nunca são
interações mutuamente exclusivas. Upload múltiplo é o caso comum, não a
exceção: selecionar 10 arquivos é tão simples quanto 1.

## 7.2 Drag and Drop

```
┌───────────────────────────────────────────┐
│                                             │
│     ⬆  Arraste arquivos aqui                │
│        ou clique para selecionar            │
│                                             │
└───────────────────────────────────────────┘
```
Ao arrastar sobre a janela, a área pontilhada destaca com borda `primary` e
fundo `accent` sutil — feedback visual imediato de "aqui é a zona de
soltar". Cada arquivo solto vira um `FileCard` com barra de progresso
individual — falha em um arquivo não cancela os demais.

## 7.3 Preview

Clique no nome/thumbnail do documento abre preview inline (painel ou modal
grande, conforme espaço de tela): PDF renderizado nativamente com paginação,
imagem em zoom, Office convertido para visualização. Preview nunca obriga
download prévio — abre direto da URL assinada.

## 7.4 Metadados

Painel lateral do preview mostra: nome, tipo, tamanho, autor do upload, data,
categoria, tags, confidencialidade, processo vinculado (link). Edição de
metadados é inline (clique no campo), sem modal separado — reafirma princípio
"poucos cliques".

## 7.5 Pastas

```
📁 Contratos
  📁 2026
    📄 contrato-locacao.pdf
    📄 aditivo-01.pdf
📁 Petições
📄 (sem pasta) comprovante-pagamento.pdf
```
Árvore lateral colapsável, drag-and-drop de documento para pasta. Profundidade
máxima de 6 níveis (reafirma
[../database/05-entidades-documentos-colaboracao.md §5.2](../database/05-entidades-documentos-colaboracao.md)) —
a UI não permite criar um 7º nível (botão "Nova subpasta" desaparece no
limite, com tooltip explicando o motivo).

## 7.6 Versões

Aba "Versões" no painel de detalhe: lista cronológica (mais recente primeiro),
cada linha com número da versão, autor, data, comentário da versão, botão
"Baixar esta versão", badge "Vigente" na primeira linha. **Nunca** um botão de
"substituir" que sobrescreva — o único caminho é "Enviar nova versão", que
sempre adiciona, nunca remove.

## 7.7 Comentários

Mesma estrutura de thread da Tela do Processo (§6.7 em
[06-processos.md](06-processos.md)), acessível na aba "Comentários" do
detalhe do documento.

## 7.8 Download

Botão "Baixar" sempre visível no header do preview — gera URL assinada de
curta duração no clique (nunca uma URL fixa reutilizável). Se
`statusAntivirus = INFECTADO`, o botão é substituído por um aviso
inline (ver [14-ux-writing.md](14-ux-writing.md) para o texto exato) — nunca
apenas desabilitado sem explicação.

## 7.9 Histórico

Mesma trilha de auditoria de acesso (visualização/download) disponível para
quem tem `audit:read` — aba "Histórico" no painel de detalhe, mostrando quem
visualizou/baixou e quando. Reafirma
[../database/06-entidades-ia-notificacoes-auditoria.md §6.6.1](../database/06-entidades-ia-notificacoes-auditoria.md).

## 7.10 Tags

Chips coloridos no card e no painel de detalhe; clique em "+ tag" abre
popover com busca + criação inline (reafirma
[04-navigation.md §4.5](04-navigation.md)).

## 7.11 Permissões

| Ação | Permissão |
|---|---|
| Ver lista/preview | `document:read` (escopo conforme papel) |
| Enviar documento | `document:create` |
| Baixar | `document:download` |
| Excluir | `document:delete` |
| Ver histórico de acesso | `audit:read` |

Documento `confidencialidade = CONFIDENCIAL` exige permissão adicional de
leitura — quando ausente, o card do documento aparece na lista (título
visível, para não quebrar a contagem/organização) mas o clique abre um
`EmptyState` de "Acesso restrito", não o preview.

## 7.12 Wireframe

```
┌──────────────────────────────────────────────────────────────┐
│  Documentos                          [+ Enviar documento]      │
│  [Buscar nesta lista...] [Filtros ▾]  [Grid ▦] [Lista ☰]        │
├───────────┬──────────────────────────────────────────────────┤
│ 📁 Todas   │  📄 contrato-locacao.pdf      2,3 MB   ⋮          │
│ 📁 Contra..│  📄 procuracao.pdf            890 KB   ⋮          │
│ 📁 Petições│  📄 comprovante.jpg           1,1 MB   ⋮          │
│ 📁 Sentenç.│                                                   │
└───────────┴──────────────────────────────────────────────────┘
```

## 7.13 Estados

Carregando: skeleton de grid/lista com forma de card real. Vazio (pasta sem
documentos): CTA "Enviar o primeiro documento desta pasta". Erro de
upload: card do arquivo específico muda para estado de erro com motivo
("Arquivo excede 100 MB", "Tipo não suportado") — nunca aborta o upload dos
demais arquivos da mesma leva.

---

**Anterior:** [06-processos.md](06-processos.md) · **Próximo:** [08-clientes.md](08-clientes.md)
