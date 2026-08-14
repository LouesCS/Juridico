# 08 — Tela de Clientes

> Estado atual: todos os registros são Clientes; categoria Contato/Ambos e Status não fazem parte da experiência. Consulte `docs/backend-implementation/25-clientes-ajuste-final.md`.

> Reafirma entidade `Cliente` de
> [../database/04-entidades-clientes-processos.md §4.1](../database/04-entidades-clientes-processos.md).

## 8.1 Cadastro

Modal rápido (`md`, 480px) acessível de qualquer lugar que referencie cliente
(botão global "+", autocomplete de cliente em formulário de processo com
opção "Criar novo"):

```
Novo Cliente
─────────────
Tipo:  ( ) Pessoa Física   ( ) Pessoa Jurídica
Nome:  [________________________]  *obrigatório

— demais campos (documento, contato, endereço) —
[Mostrar mais campos ▾]

[Cancelar]                          [Salvar]
```

Único campo obrigatório: nome + tipo. Todo o resto atrás de "Mostrar mais
campos" — reafirma jornada 3.5 e princípio de progressive disclosure.

## 8.2 Lista

```
┌──────────────────────────────────────────────────────────────┐
│  Clientes                                  [+ Novo Cliente]    │
│  [Buscar por nome ou documento...] [Filtros ▾]                 │
├──────────────────────────────────────────────────────────────┤
│  Nome              Tipo   Processos ativos   Responsável   ⋮  │
│  João Silva        PF     3                   Camila T.        │
│  Empresa XYZ Ltda  PJ     7                   Ricardo A.       │
└──────────────────────────────────────────────────────────────┘
```
Tabela densa por padrão (clientes têm poucas colunas relevantes, cabe a regra
de "evitar tabelas gigantes" sem sacrificar nada). Filtros: tipo, status,
responsável. Busca local por nome/documento (mascarado no resultado).

## 8.3 Perfil do Cliente

```
┌──────────────────────────────────────────────────────────────┐
│ ‹ Clientes                                                     │
│ João Silva (PF)                              [Editar] [⋮]      │
│ CPF: ***.**6-78  ·  contato@email.com  ·  (11) 9****-1234       │
├──────────────────────────────────────────────────────────────┤
│ Visão Geral | Processos | Documentos | Contato | Histórico     │
├──────────────────────────────────────────────────────────────┤
│  PROCESSOS ATIVOS (3)              │  RESPONSÁVEL INTERNO       │
│  • Ação Trabalhista — nº ...        │  [avatar] Camila T.        │
│  • Divórcio Consensual — nº ...     │                            │
│  [+ novo processo para este cliente]│  OBSERVAÇÕES               │
└──────────────────────────────────────────────────────────────┘
```

### 8.3.1 Aba Processos
Lista de processos deste cliente (todos os polos), com atalho direto "+ novo
processo para este cliente" (pré-preenche o cliente no wizard, reafirma
princípio de poucos cliques).

### 8.3.2 Aba Documentos
Documentos vinculados diretamente ao cliente (não a um processo específico) —
ex.: procuração geral, contrato de honorários.

### 8.3.3 Aba Contato
E-mails, telefones, endereço — múltiplos valores com rótulo, edição inline.

### 8.3.4 Aba Histórico
Trilha de auditoria (criação, edição de documento sensível como CPF/CNPJ).

## 8.4 Wireframe

Ver [16-wireframes.md §16.4](16-wireframes.md).

## 8.5 Estados

Vazio (nenhum cliente cadastrado): `EmptyState` com CTA "Cadastre seu primeiro
cliente". Duplicidade de documento: aviso não bloqueante inline no formulário
("Já existe um cliente com este CPF: João Silva — [ver cadastro]"), nunca
impede salvar (reafirma
[../database/04-entidades-clientes-processos.md §4.1](../database/04-entidades-clientes-processos.md)).

## 8.6 Permissões

Leitura ampla para a maioria dos papéis (reafirma matriz de
[../database/08-permissoes-seguranca.md §8.3](../database/08-permissoes-seguranca.md));
Estagiário só vê clientes de processos atribuídos a ele — cliente fora desse
escopo não aparece na lista.

## 8.7 Responsividade

Tablet/mobile: tabela vira lista de cards (nome + tipo + nº de processos),
abas do perfil viram menu suspenso.

---

**Anterior:** [07-documentos.md](07-documentos.md) · **Próximo:** [09-busca-global.md](09-busca-global.md)
