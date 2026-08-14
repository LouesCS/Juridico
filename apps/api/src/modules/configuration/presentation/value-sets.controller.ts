import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import {
  AddValueSetItemUseCase,
  CreateValueSetUseCase,
  DeleteValueSetUseCase,
  GetValueSetUseCase,
  ListValueSetsUseCase,
  RemoveValueSetItemUseCase,
  UpdateValueSetItemUseCase,
  UpdateValueSetUseCase,
} from '../application/value-sets.use-cases';
import {
  createValueSetItemSchema,
  createValueSetSchema,
  updateValueSetItemSchema,
  updateValueSetSchema,
} from './schemas/configuration.schemas';

@ApiTags('Configuration')
@Controller('configuration/value-sets')
export class ValueSetsController {
  constructor(
    private readonly listUseCase: ListValueSetsUseCase,
    private readonly getUseCase: GetValueSetUseCase,
    private readonly createUseCase: CreateValueSetUseCase,
    private readonly updateUseCase: UpdateValueSetUseCase,
    private readonly deleteUseCase: DeleteValueSetUseCase,
    private readonly addItemUseCase: AddValueSetItemUseCase,
    private readonly updateItemUseCase: UpdateValueSetItemUseCase,
    private readonly removeItemUseCase: RemoveValueSetItemUseCase,
  ) {}

  @Get()
  @RequirePermission('configuration:read')
  async list(@CurrentUser() user: AuthUser) {
    return this.listUseCase.execute(user.escritorioId);
  }

  @Get(':id')
  @RequirePermission('configuration:read')
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.getUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('CREATE_VALUE_SET', 'CONJUNTO_VALORES')
  @Post()
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(createValueSetSchema))
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.createUseCase.execute(user.escritorioId, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_VALUE_SET', 'CONJUNTO_VALORES')
  @Patch(':id')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(updateValueSetSchema))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.updateUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
  }

  @Audit('DELETE_VALUE_SET', 'CONJUNTO_VALORES')
  @Delete(':id')
  @RequirePermission('configuration:manage')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.deleteUseCase.execute(user.escritorioId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('ADD_VALUE_SET_ITEM', 'CONJUNTO_VALORES')
  @Post(':id/items')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(createValueSetItemSchema))
  async addItem(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const result = await this.addItemUseCase.execute(user.escritorioId, id, body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Audit('UPDATE_VALUE_SET_ITEM', 'CONJUNTO_VALORES')
  @Patch(':id/items/:itemId')
  @RequirePermission('configuration:manage')
  @UsePipes(new ZodValidationPipe(updateValueSetItemSchema))
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.updateItemUseCase.execute(
      user.escritorioId,
      id,
      itemId,
      body as never,
    );
    if (!result.ok) throw result.error;
  }

  @Audit('REMOVE_VALUE_SET_ITEM', 'CONJUNTO_VALORES')
  @Delete(':id/items/:itemId')
  @RequirePermission('configuration:manage')
  @HttpCode(204)
  async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.removeItemUseCase.execute(user.escritorioId, id, itemId);
    if (!result.ok) throw result.error;
  }
}
