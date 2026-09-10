import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { PracticeSessionsService } from './practice-sessions.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { QueryPracticeSessionsDto } from './dto/query-practice-sessions.dto';

@ApiTags('practice-sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('practice-sessions')
export class PracticeSessionsController {
  constructor(private readonly service: PracticeSessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar una sesión de práctica' })
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreatePracticeSessionDto,
  ) {
    return this.service.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mi historial de sesiones' })
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query() q: QueryPracticeSessionsDto,
  ) {
    return this.service.findAllForUser(user.sub, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una sesión por id' })
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.findOneOwned(user.sub, id);
  }
}
