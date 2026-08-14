import { Usuario } from '@prisma/client';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

export interface CriarUsuarioInput {
  nome: string;
  sobrenome: string;
  email: string;
  senhaHash: string;
}

/**
 * Interface de domínio (port) — reafirma docs/backend/03-camadas.md §3.2.
 * `Usuario` é global (sem escritorioId), por isso não estende
 * BaseTenantRepository.
 */
export interface UsuarioRepository {
  criar(input: CriarUsuarioInput): Promise<Usuario>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  atualizarSenhaHash(usuarioId: string, senhaHash: string): Promise<void>;
  atualizarUltimoAcesso(usuarioId: string): Promise<void>;
}
