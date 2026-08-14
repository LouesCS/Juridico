import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';

/**
 * `Cliente` não tem coluna própria de arquivamento (diferente de
 * `Processo.arquivadoEm`) — "arquivar" reaproveita `status = INATIVO`, já
 * modelado em `StatusCliente`. Rotas não documentadas em
 * docs/api/08-clients.md original; adicionadas nesta rodada para atender
 * PROMPT 7 e já registradas de volta no doc (ver §8.7/§8.8/§8.9 novos).
 * Sprint "Clientes e Contatos": passa a registrar `ARQUIVAMENTO` na
 * Timeline (fan-out por Processo vinculado, mesma limitação de
 * `UpdateClientUseCase` — sem Processo vinculado, sem evento).
 */
@Injectable()
export class ArchiveClientUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    clienteId: string,
    atorMembroId?: string,
  ): Promise<Result<void>> {
    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, escritorioId },
      select: { id: true, nome: true },
    });
    if (!cliente) return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));

    await this.prisma.client.cliente.update({
      where: { id: clienteId },
      data: { status: 'INATIVO' },
    });

    const processos = await this.prisma.client.processo.findMany({
      where: { clienteId },
      select: { id: true },
    });
    await Promise.all(
      processos.map((p) =>
        this.timeline.record({
          escritorioId,
          processoId: p.id,
          tipo: 'ARQUIVAMENTO',
          titulo: `Cliente ${cliente.nome} foi arquivado`,
          autorId: atorMembroId,
          entidadeRelacionadaTipo: 'cliente',
          entidadeRelacionadaId: clienteId,
        }),
      ),
    );

    return Result.ok(undefined);
  }
}

@Injectable()
export class RestoreClientUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  /**
   * Restaurar precisa enxergar um cliente com `excluidoEm` preenchido — a
   * extensão de soft-delete (`soft-delete.extension.ts`) injeta
   * `excluidoEm: null` em toda leitura por `prisma.client`, inclusive quando
   * o `where` já traz `excluidoEm: undefined` (o "escape hatch" documentado
   * como `INCLUDE_DELETED` não distingue "chave ausente" de "chave presente
   * com valor `undefined`" — mesmo efeito para `args.where?.['excluidoEm']
   * === undefined` — então hoje não escapa o filtro; achado registrado em
   * docs/backend-implementation/19-decisions.md para correção futura da
   * extensão compartilhada, fora do escopo desta rodada). Usa SQL
   * parametrizado (nunca interpolação de string) para contornar apenas
   * este caso, sem alterar a extensão global.
   */
  async execute(
    escritorioId: string,
    clienteId: string,
    atorMembroId?: string,
  ): Promise<Result<void>> {
    const encontrados = await this.prisma.client.$queryRaw<Array<{ id: string; nome: string }>>`
      SELECT id, nome FROM clientes WHERE id = ${clienteId}::uuid AND escritorio_id = ${escritorioId}::uuid
    `;
    if (encontrados.length === 0) {
      return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));
    }

    await this.prisma.client.$executeRaw`
      UPDATE clientes SET excluido_em = NULL, status = 'ATIVO'
      WHERE id = ${clienteId}::uuid AND escritorio_id = ${escritorioId}::uuid
    `;

    const processos = await this.prisma.client.processo.findMany({
      where: { clienteId },
      select: { id: true },
    });
    await Promise.all(
      processos.map((p) =>
        this.timeline.record({
          escritorioId,
          processoId: p.id,
          tipo: 'RESTAURACAO',
          titulo: `Cliente ${encontrados[0].nome} foi restaurado`,
          autorId: atorMembroId,
          entidadeRelacionadaTipo: 'cliente',
          entidadeRelacionadaId: clienteId,
        }),
      ),
    );

    return Result.ok(undefined);
  }
}

@Injectable()
export class DuplicateClientUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, clienteId: string): Promise<Result<{ id: string }>> {
    const original = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, escritorioId },
    });
    if (!original) return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));

    const copia = await this.prisma.client.cliente.create({
      data: {
        escritorioId,
        tipo: original.tipo,
        nome: `${original.nome} (cópia)`,
        nomeSocial: original.nomeSocial,
        razaoSocial: original.razaoSocial,
        // CPF/CNPJ e contatos não são duplicados — um cliente real não pode
        // ter dois cadastros com o mesmo documento; a cópia serve para reuso
        // do cadastro-base (endereço, responsável), não para reidentificar
        // a mesma pessoa duas vezes.
        enderecoLogradouro: original.enderecoLogradouro,
        enderecoNumero: original.enderecoNumero,
        enderecoComplemento: original.enderecoComplemento,
        enderecoBairro: original.enderecoBairro,
        enderecoCidade: original.enderecoCidade,
        enderecoUf: original.enderecoUf,
        enderecoCep: original.enderecoCep,
        observacoes: original.observacoes,
        responsavelId: original.responsavelId,
        status: 'PROSPECT',
        categoriaRelacionamento: original.categoriaRelacionamento,
        profissao: original.profissao,
        estadoCivil: original.estadoCivil,
        // Foto/nome da mãe/nome do pai/data de nascimento/campos extras não
        // são duplicados — mesmo racional de CPF/CNPJ/contatos: a cópia é
        // um cadastro-base reutilizável, não uma segunda identidade da
        // mesma pessoa.
      },
      select: { id: true },
    });

    return Result.ok(copia);
  }
}
