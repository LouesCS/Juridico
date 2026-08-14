# 06 — Autorização (Implementação NestJS)

> Contrato já fechado em [../api/03-autorizacao.md](../api/03-autorizacao.md)
> e modelo em [../database/08-permissoes-seguranca.md](../database/08-permissoes-seguranca.md).
> Aqui: como as duas etapas de verificação são implementadas em código.

## 6.1 Etapa 1 — `PermissionGuard` + decorator

```
@RequirePermission('case:read:assigned')
@Get(':id')
async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) { ... }
```
`PermissionGuard` lê os metadados do decorator (`Reflector`), compara contra
`user.permissions` (resolvido no login/refresh a partir de `Papel` +
`PermissaoUsuario`, reafirma
[../database/03-entidades-identidade-escritorios.md §3.9](../database/03-entidades-identidade-escritorios.md)) —
`NEGAR` de `PermissaoUsuario` sempre vence `CONCEDER` do papel, resolvido
nesta mesma checagem.

## 6.2 Etapa 2 — Policy de autorização de recurso (camada de aplicação)

Cada módulo com regra de escopo define uma `*.policy.ts`:

```
class ProcessoAcessoPolicy {
  podeAcessar(usuario: AuthUser, processo: Processo): boolean {
    if (processo.segredoJustica) {
      return this.ehResponsavelOuEquipe(usuario, processo)
          || usuario.roles.includes('SOCIO')
          || usuario.roles.includes('OWNER');
    }
    if (usuario.permissionScope('case:read') === 'ALL') return true;
    if (usuario.permissionScope('case:read') === 'TEAM') return this.equipeCompartilhada(usuario, processo);
    return this.ehResponsavelOuEquipe(usuario, processo); // ASSIGNED
  }
}
```

**Regra:** todo use case de leitura/escrita de um recurso com escopo chama a
policy correspondente **depois** de carregar o registro (nunca antes —
precisa do dado para decidir) e **antes** de retornar/alterar qualquer
coisa. Falha da policy → `Result` de falha mapeado a `404` pelo
`DomainExceptionFilter` (nunca `403`, reafirma
[../api/03-autorizacao.md §3.9](../api/03-autorizacao.md)) — a policy em si
não decide o status HTTP, apenas retorna `boolean`/`Result`; a tradução para
404 é responsabilidade do filter, mantendo a policy livre de conhecimento de
HTTP.

## 6.3 Prevenção de auto-escalonamento

`AlterarPapelMembroUseCase` verifica `actorId !== targetMembroId` antes de
qualquer outra validação — reafirma regra 25 de
[../database/12-eventos-fluxos-regras.md §12.4](../database/12-eventos-fluxos-regras.md).
Implementado no use case, não no guard (é regra de negócio específica desta
operação, não uma checagem genérica de permissão).

## 6.4 Decorators de contexto

| Decorator | Extrai |
|---|---|
| `@CurrentUser()` | `AuthUser` completo (id, membroId, roles, permissions) da claim do JWT |
| `@Tenant()` | `escritorioId` ativo — **nunca** de parâmetro de rota/body, sempre da claim (reafirma [../api/03-autorizacao.md §3.5](../api/03-autorizacao.md)) |
| `@RequirePermission(chave)` | Metadado lido pelo `PermissionGuard` |
| `@Audit(acao)` | Metadado lido pelo `AuditInterceptor` — dispara `LogAuditoria` após a resposta bem-sucedida |
| `@Public()` | Marca rota como isenta de `JwtAuthGuard`/`TenantGuard` |

## 6.5 Secret Manager e configuração sensível

Chave privada JWT, credenciais de OAuth, chave de criptografia de MFA/tokens
externos e credenciais de provedor de e-mail/IA/storage vivem em Secret
Manager (AWS Secrets Manager, Vault, ou equivalente do provedor escolhido
em [../10-roadmap-e-decisoes.md](../10-roadmap-e-decisoes.md)) — nunca em
`.env` versionado nem em variável de ambiente plana em produção; `.env`
local (desenvolvimento) usa valores de desenvolvimento isolados, nunca
credencial real. `env.schema.ts` (Zod) falha o boot se qualquer segredo
obrigatório estiver ausente, reafirma
[../05-arquitetura-backend.md §5.1](../05-arquitetura-backend.md) fail fast.

## 6.6 Logs e auditoria na camada de autorização

Toda negação de acesso (`403`/`404` por policy) gera `LogAuditoria` com
`resultado: NEGADO` e `motivo` preenchido — reafirma
[../database/06-entidades-ia-notificacoes-auditoria.md §6.6](../database/06-entidades-ia-notificacoes-auditoria.md);
capturado pelo mesmo `AuditInterceptor`, não por código manual em cada use
case.

---

**Anterior:** [05-autenticacao.md](05-autenticacao.md) · **Próximo:** [07-storage.md](07-storage.md)
