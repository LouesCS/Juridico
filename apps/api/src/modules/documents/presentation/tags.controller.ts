import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateTagUseCase, ListTagsUseCase } from '../application/use-cases/tag.use-cases';
import { createTagSchema } from './schemas/document.schemas';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(
    private readonly listTags: ListTagsUseCase,
    private readonly createTag: CreateTagUseCase,
  ) {}

  @Get()
  @RequirePermission('document:read:assigned')
  async list(@CurrentUser() user: AuthUser) {
    const result = await this.listTags.execute(user.escritorioId);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Post()
  @RequirePermission('tag:manage')
  @UsePipes(new ZodValidationPipe(createTagSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createTag.execute(user.escritorioId, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }
}
