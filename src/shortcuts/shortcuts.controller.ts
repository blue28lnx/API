import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { ShortcutsService } from './shortcuts.service';
import { CreateShortcutDto } from './dto/create-shortcut.dto';
import { UpdateShortcutDto } from './dto/update-shortcut.dto';

@ApiTags('shortcuts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('shortcuts')
export class ShortcutsController {
  constructor(private readonly shortcuts: ShortcutsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis shortcuts' })
  @ApiQuery({ name: 'tool', required: false, example: 'VS Code' })
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query('tool') tool?: string,
  ) {
    return this.shortcuts.findAllByUser(user.sub, tool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un shortcut por id' })
  @ApiResponse({ status: 404, description: 'Shortcut no encontrado' })
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.shortcuts.findOneOwned(user.sub, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un shortcut' })
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateShortcutDto) {
    return this.shortcuts.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modificar un shortcut propio' })
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShortcutDto,
  ) {
    return this.shortcuts.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un shortcut propio' })
  remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.shortcuts.remove(user.sub, id);
  }
}
