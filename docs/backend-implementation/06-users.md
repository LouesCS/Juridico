# 06 — Users *(não implementado nesta rodada)*

Nenhum código de `modules/users/` foi criado. Já prontos para uso imediato:
schema (`Usuario` completo em `schema.prisma`), contrato
(`docs/api/07-users.md`), arquitetura (`docs/backend/02-modulos.md §2.4`).

**Primeiro passo da próxima rodada:** `PATCH /me`, `POST/DELETE /me/avatar`,
`PATCH /me/preferences`, `GET/DELETE /me/identities/:id`, `POST /me/export`,
`POST /me/delete-request` — todos sobre a mesma tabela `Usuario` já
implementada em `Identity`; a distinção dos dois módulos é só de
responsabilidade (autenticação vs. perfil), reafirma
`docs/backend/02-modulos.md §2.4`.

---

**Anterior:** [05-offices-memberships.md](05-offices-memberships.md) · **Próximo:** [07-clients.md](07-clients.md)
