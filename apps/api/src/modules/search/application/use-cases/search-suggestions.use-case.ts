import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';

interface QuickAction {
  label: string;
  action: 'navigate';
  url: string;
  permissao: string;
}

/**
 * Reafirma docs/api/15-search.md §15.2 e docs/ux/09-busca-global.md §9.4 —
 * campo vazio mostra "Recentes" (client-side, `localStorage`, ver
 * docs/frontend/21-search.md §21.4) + "Sugestões" (aqui). Navega para a tela
 * de listagem (`/processos`, `/clientes`), não para uma rota "/novo"
 * dedicada — criação nestas telas é sempre via diálogo embutido
 * (`LegalCaseFormDialog`/equivalente), não uma rota própria; simplificação
 * deliberada em vez de inventar um parâmetro de auto-abertura de diálogo.
 */
const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Novo Cliente', action: 'navigate', url: '/clientes', permissao: 'client:create' },
  {
    label: 'Enviar Documento',
    action: 'navigate',
    url: '/documentos',
    permissao: 'document:create',
  },
];

@Injectable()
export class SearchSuggestionsUseCase {
  execute(user: AuthUser) {
    const sugestoes = QUICK_ACTIONS.filter((a) => user.permissions.includes(a.permissao)).map(
      ({ label, action, url }) => ({ label, action, url }),
    );
    return { sugestoes };
  }
}
