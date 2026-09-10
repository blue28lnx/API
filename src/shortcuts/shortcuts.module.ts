import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ShortcutsController } from './shortcuts.controller';
import { ShortcutsService } from './shortcuts.service';

@Module({
  imports: [AuthModule], // para reutilizar JwtAuthGuard y la infra de auth
  controllers: [ShortcutsController],
  providers: [ShortcutsService],
  exports: [ShortcutsService],
})
export class ShortcutsModule {}
