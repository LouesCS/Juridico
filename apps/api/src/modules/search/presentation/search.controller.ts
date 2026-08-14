import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SearchSuggestionsUseCase } from '../application/use-cases/search-suggestions.use-case';
import { UniversalSearchUseCase } from '../application/use-cases/universal-search.use-case';
import { searchQuerySchema } from './schemas/search.schemas';

/**
 * Reafirma docs/api/15-search.md. Gate de rota em `office:read` (concedida a
 * todo papel do sistema, incluindo ESTAGIARIO — ver `prisma/seed.ts`) porque
 * a busca em si é uma feature de navegação disponível a qualquer membro do
 * escritório; o filtro real de permissão acontece POR TIPO dentro de cada
 * adapter (`search-adapters.ts`), nunca aqui — reafirma "Filtrado por
 * permissão, por tipo de resultado" (docs/api/15-search.md §Objetivo).
 *
 * `GET /v1/search/recent` e `DELETE /v1/search/history` (documentados em
 * docs/api/15-search.md §15.3/§15.4) não são implementados nesta rodada — a
 * própria doc já resolve os dois como client-side puro no MVP (`localStorage`,
 * nunca sincronizado ao servidor), reafirmado por docs/frontend/21-search.md
 * §21.4. Implementar um endpoint que nada consumiria seria construir
 * superfície morta.
 */
@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly universalSearch: UniversalSearchUseCase,
    private readonly suggestions: SearchSuggestionsUseCase,
  ) {}

  @Get()
  @RequirePermission('office:read')
  async search(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.universalSearch.execute(user.escritorioId, user, searchQuerySchema.parse(query));
  }

  @Get('suggestions')
  @RequirePermission('office:read')
  async getSuggestions(@CurrentUser() user: AuthUser) {
    return this.suggestions.execute(user);
  }
}
