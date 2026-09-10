// Limpia la tabla shortcuts y las practice_sessions con shortcutId para
// poder correr la migración que dropea userId de Shortcut.
const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  try {
    const r1 = await p.practiceSession.deleteMany({
      where: { shortcutId: { not: null } },
    });
    const r2 = await p.shortcut.deleteMany({});
    console.log('practice_sessions borradas con shortcut:', r1.count);
    console.log('shortcuts borrados:', r2.count);
  } finally {
    await p.$disconnect();
  }
})();
