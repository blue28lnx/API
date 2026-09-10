import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PracticeSessionsController } from './practice-sessions.controller';
import { PracticeSessionsService } from './practice-sessions.service';

@Module({
  imports: [AuthModule],
  controllers: [PracticeSessionsController],
  providers: [PracticeSessionsService],
})
export class PracticeSessionsModule {}
