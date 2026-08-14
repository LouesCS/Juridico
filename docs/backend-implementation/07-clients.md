# 07 — Clients *(não implementado nesta rodada)*

Nenhum código de `modules/clients/` foi criado. Já prontos: schema
(`Cliente` completo, com índices por nome/CPF/CNPJ), contrato
(`docs/api/08-clients.md`), regras de duplicidade não-bloqueante já
especificadas.

**Primeiro passo da próxima rodada:** CRUD completo seguindo exatamente o
padrão já estabelecido em `Offices`/`Memberships` (use case direto sobre
`PrismaService`, sem repositório de interface dedicado — reafirma
simplificação registrada em [19-decisions.md](19-decisions.md)); validação
de CPF/CNPJ (dígito verificador) fica em `common/validators/`, ainda não
escrita.

---

**Anterior:** [06-users.md](06-users.md) · **Próximo:** [08-legal-cases.md](08-legal-cases.md)
