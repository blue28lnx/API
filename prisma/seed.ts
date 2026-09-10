/**
 * Seed opcional: crea un usuario demo con 3 shortcuts.
 * Ejecutar con: pnpm seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@shortcuts.local';
  const password = await bcrypt.hash('Demo1234', 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password },
  });

  const seeds = [
    { action: 'Open command palette', tool: 'VS Code', expectedCombo: 'Ctrl+Shift+P', category: 'navigation' },
    { action: 'Quick open file',       tool: 'VS Code', expectedCombo: 'Ctrl+P',       category: 'navigation' },
    { action: 'Toggle sidebar',        tool: 'VS Code', expectedCombo: 'Ctrl+B',       category: 'view' },
  ];

  for (const s of seeds) {
    await prisma.shortcut.create({
      data: {
        userId: user.id,
        action: s.action,
        tool: s.tool,
        expectedCombo: s.expectedCombo.replaceAll('+', ','),
        category: s.category,
      },
    });
  }

  console.log('✅ Seed listo. Usuario:', email, '/ pass: Demo1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
