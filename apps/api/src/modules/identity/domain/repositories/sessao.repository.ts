import { Sessao } from '@prisma/client';

export const SESSAO_REPOSITORY = Symbol('SESSAO_REPOSITORY');

export interface CriarSessaoInput {
  usuarioId: string;
  escritorioAtivoId: string;
  familiaId: string;
  refreshTokenHash: string;
  ip?: string;
  userAgent?: string;
  dispositivo?: string;
  expiraEm: Date;
}

export interface SessaoRepository {
  criar(input: CriarSessaoInput): Promise<Sessao>;
  buscarPorId(id: string): Promise<Sessao | null>;
  listarAtivasPorUsuario(usuarioId: string): Promise<Sessao[]>;
  revogar(id: string, motivo: Sessao['motivoRevogacao']): Promise<void>;
  revogarFamilia(familiaId: string, motivo: Sessao['motivoRevogacao']): Promise<void>;
  revogarTodasDoUsuario(
    usuarioId: string,
    exceto: string | undefined,
    motivo: Sessao['motivoRevogacao'],
  ): Promise<void>;
  atualizarUltimoUso(id: string): Promise<void>;
}
