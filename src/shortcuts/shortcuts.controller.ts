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
  @ApiOperation({ summary: 'Listar shortcuts del catálogo' })
  @ApiQuery({ name: 'tool', required: false, example: 'VS Code' })
  list(@Query('tool') tool?: string) {
    return this.shortcuts.findAll(tool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un shortcut por id' })
  @ApiResponse({ status: 404, description: 'Shortcut no encontrado' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.shortcuts.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un shortcut en el catálogo' })
  create(@Body() dto: CreateShortcutDto) {
    return this.shortcuts.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modificar un shortcut del catálogo' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShortcutDto,
  ) {
    return this.shortcuts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un shortcut del catálogo' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.shortcuts.remove(id);
  }
}
