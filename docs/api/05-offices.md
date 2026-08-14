# 05 — Offices (Endpoints)

> Entidade `Escritorio` em
> [../database/03-entidades-identidade-escritorios.md §3.4](../database/03-entidades-identidade-escritorios.md).

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/office` | Detalhes do escritório ativo | `office:read` (todos os papéis) |
| `PATCH` | `/v1/office` | Atualizar dados do escritório | `office:update` |
| `PATCH` | `/v1/office/settings` | Atualizar configurações (MFA obrigatório, domínios SSO, retenção) | `office:update` (apenas OWNER/ADMIN) |
| `DELETE` | `/v1/office` | Encerrar escritório | Apenas `OWNER` |
| `GET` | `/v1/office/usage` | Uso de armazenamento, cota de IA, usuários ativos | `ai:usage:read` / `office:update` |

## 5.1 `GET /v1/office`

**Resposta 200:**
```json
{
  "id": "...", "nomeFantasia": "Almeida Advogados", "slug": "almeida-advogados",
  "razaoSocial": null, "cnpj": null, "email": "contato@almeida.com.br",
  "status": "TRIAL", "plano": "TRIAL",
  "configuracoes": { "mfaObrigatorio": false, "dominiosSSO": [] }
}
```

## 5.2 `PATCH /v1/office`

**Body (parcial):** qualquer campo de
[18-dtos.md §18.3 `AtualizarEscritorioDTO`](18-dtos.md). **Regras:** `slug`
não é alterável por este endpoint (é identificador estável usado em URL/link
de convite) — mudança de `slug`, se necessária no futuro, é operação
administrativa separada com aviso de quebra de link.

## 5.3 `DELETE /v1/office`

**Permissão:** exclusivo de `OWNER`. **Body:** `{ "confirmacaoNome": "Almeida Advogados" }`
— reafirma padrão de confirmação de ação perigosa de
[../ux/13-componentes.md §13.5 ConfirmDialog](../ux/13-componentes.md).
**Resposta 202** (processamento assíncrono de encerramento). **Regras:**
revoga todas as sessões de todos os membros imediatamente; reafirma
[../database/10-soft-delete-retencao-lgpd.md §10.11](../database/10-soft-delete-retencao-lgpd.md).
**Erros:** `422` se `confirmacaoNome` não confere · `403` se não for `OWNER`.

## 5.4 `GET /v1/office/usage`

**Resposta 200:**
```json
{
  "armazenamentoUsadoBytes": 1073741824, "armazenamentoLimiteBytes": 10737418240,
  "usuariosAtivos": 8, "usuariosLimite": 20,
  "iaResumosGeradosNoMes": 42, "iaCotaMensal": 200, "iaCustoEstimadoCentavosNoMes": 1250
}
```
Visível a `OWNER`/`ADMIN`/`SOCIO` (reafirma
[../ux/06-processos.md §6.2.1](../ux/06-processos.md) — custo de IA não é
exibido ao Advogado/Estagiário).

---

**Anterior:** [04-identity.md](04-identity.md) · **Próximo:** [06-memberships.md](06-memberships.md)
