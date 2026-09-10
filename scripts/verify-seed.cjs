// Verificación rápida de la carga: muestra 5 shortcuts de muestra
// y los más raros (combo con +, level EXPERT, etc.).
const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  try {
    const total = await p.shortcut.count();
    const byLevel = await p.shortcut.groupBy({
      by: ['level'],
      _count: { _all: true },
      orderBy: { level: 'asc' },
    });

    const sample = await p.shortcut.findMany({
      take: 5,
      orderBy: { tool: 'asc' },
    });

    // Casos especiales para chequear el parseo
    const slash = await p.shortcut.findFirst({
      where: { expectedCombo: { contains: '/' } },
    });
    const arrow = await p.shortcut.findFirst({
      where: { expectedCombo: { contains: 'Up' } },
    });
    const expert = await p.shortcut.findMany({
      where: { level: 'EXPERT' },
      select: { tool: true, action: true, expectedCombo: true, level: true },
    });

    console.log('=== Total shortcuts:', total);
    console.log('=== Por level:');
    for (const g of byLevel) console.log(`   - ${g.level}: ${g._count._all}`);

    console.log('\n=== Muestra (5):');
    for (const s of sample) {
      console.log(`   [${s.tool}] ${s.action}`);
      console.log(`     combo (DB)  : "${s.expectedCombo}"`);
      console.log(`     combo (API) : ${JSON.stringify(s.expectedCombo.split(','))}`);
      console.log(`     level       : ${s.level}`);
    }

    console.log('\n=== Casos con "/" (Ctrl+/):');
    if (slash) {
      console.log(`   ${slash.action} -> ${JSON.stringify(slash.expectedCombo.split(','))}`);
    }
    console.log('\n=== Casos con flechas:');
    if (arrow) {
      console.log(`   ${arrow.action} -> ${JSON.stringify(arrow.expectedCombo.split(','))}`);
    }
    console.log('\n=== EXPERT (level 4):');
    for (const s of expert) {
      console.log(`   [${s.tool}] ${s.action} -> ${JSON.stringify(s.expectedCombo.split(','))}`);
    }
  } finally {
    await p.$disconnect();
  }
})();
