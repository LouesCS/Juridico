import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service';

/**
 * Resolve a lista final de permissões de um membro: permissões do `Papel`
 * (via `PapelPermissao`) + overrides individuais (`PermissaoUsuario`, onde
 * `NEGAR` sempre vence `CONCEDER`, inclusive vencendo uma concessão do
 * próprio papel).
 *
 * Extraído nesta rodada (Permission Engine, Prompt 12) de três cópias quase
 * idênticas que existiam em `LoginUseCase`, `RefreshTokenUseCase` e
 * `SwitchOfficeUseCase` — bug real encontrado ao consolidar: só
 * `LoginUseCase` aplicava os overrides de `PermissaoUsuario`; refresh e
 * troca de escritório reemitiam o token só com as permissões do papel, sem
 * overrides — ou seja, revogar uma permissão específica de um membro só
 * "pegava" depois do próximo login completo, nunca num refresh silencioso.
 * Corrigido consolidando as três chamadas nesta única implementação.
 *
 * Segundo bug real corrigido: `expiraEm` de `PermissaoUsuario` era
 * selecionado mas nunca comparado a `now()` — um override expirado
 * continuava sendo aplicado como se estivesse ativo. Agora um override com
 * `expiraEm` no passado é ignorado.
 */
@Injectable()
export class PermissionResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveEffectivePermissions(membroId: string, papelId: string): Promise<string[]> {
    const papelPermissoes = await this.prisma.client.papelPermissao.findMany({
      where: { papelId },
      include: { permissao: true },
    });
    const concedidas = new Set(papelPermissoes.map((pp) => pp.permissao.chave));

    const overrides = await this.prisma.client.permissaoUsuario.findMany({
      where: { membroId },
      include: { permissao: true },
    });
    const agora = new Date();
    for (const override of overrides) {
      if (override.expiraEm && override.expiraEm < agora) continue;
      if (override.efeito === 'CONCEDER') concedidas.add(override.permissao.chave);
      if (override.efeito === 'NEGAR') concedidas.delete(override.permissao.chave);
    }

    return Array.from(concedidas);
  }
}
