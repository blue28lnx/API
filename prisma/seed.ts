/**
 * Seed: carga el catálogo global de shortcuts desde
 *       prisma/data/catalogo.json.
 *
 * Mapeo:
 *   description    -> action
 *   expectedCombo  -> serializado como string separado por comas
 *                     (ej: "Ctrl+Shift+P" -> "Ctrl,Shift,P")
 *   level (1-4)    -> enum Level (BEGINNER / INTERMEDIATE / ADVANCED / EXPERT)
 *   tool           -> tool
 *
 * Idempotencia: borra todos los shortcuts del catálogo antes de cargar,
 *               así re-correr el seed deja el mismo estado final.
 *
 * Ejecutar: pnpm seed
 */
import { Level, PrismaClient } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

const prisma = new PrismaClient();

const COMBO_SEPARATOR = ',';

type CatalogoItem = {
  id: number;
  description: string;
  expectedCombo: string;
  tool: string;
  level: number;
};

const LEVEL_MAP: Record<number, Level> = {
  1: Level.BEGINNER,
  2: Level.INTERMEDIATE,
  3: Level.ADVANCED,
  4: Level.EXPERT,
};

/**
 * "Ctrl+Shift+P" -> ["Ctrl","Shift","P"]
 * "Ctrl+/"       -> ["Ctrl","/"]
 * "Shift+Alt+Down"-> ["Shift","Alt","Down"]
 * "F12"          -> ["F12"]
 * El split por '+' es seguro en este dataset porque las teclas con '+'
 * en su nombre (slash, flechas, etc.) son siempre el último token y
 * no contienen '+' literal.
 */
function parseCombo(raw: string): string[] {
  return raw
    .split('+')
    .map((k) => k.trim())
    .filter(Boolean);
}

function serializeCombo(combo: string[]): string {
  return combo.join(COMBO_SEPARATOR);
}

async function main() {
  const dataPath = path.join(__dirname, 'data', 'catalogo.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const items = JSON.parse(raw) as CatalogoItem[];

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`Catálogo vacío o inválido en ${dataPath}`);
  }

  // Limpiamos el catálogo y dejamos las practice_sessions con shortcutId=NULL
  // (onDelete: SetNull en la FK hace este paso seguro).
  const deleted = await prisma.shortcut.deleteMany({});
  console.log(`🧹 Shortcuts previos eliminados: ${deleted.count}`);

  let ok = 0;
  let skipped = 0;

  for (const item of items) {
    const level = LEVEL_MAP[item.level];
    if (!level) {
      console.warn(
        `⚠️  Item id=${item.id} tiene level=${item.level} (fuera de 1-4), lo salteo.`,
      );
      skipped++;
      continue;
    }

    if (!item.description || !item.expectedCombo || !item.tool) {
      console.warn(`⚠️  Item id=${item.id} incompleto, lo salteo.`);
      skipped++;
      continue;
    }

    const combo = parseCombo(item.expectedCombo);
    if (combo.length === 0 || combo.length > 6) {
      console.warn(
        `⚠️  Item id=${item.id} combo inválido ('${item.expectedCombo}'), lo salteo.`,
      );
      skipped++;
      continue;
    }

    await prisma.shortcut.create({
      data: {
        action: item.description.trim(),
        tool: item.tool.trim(),
        expectedCombo: serializeCombo(combo),
        level,
      },
    });
    ok++;
  }

  // Resumen por herramienta
  const grouped = await prisma.shortcut.groupBy({
    by: ['tool'],
    _count: { _all: true },
    orderBy: { tool: 'asc' },
  });

  console.log('');
  console.log(`✅ Seed listo. Cargados: ${ok} | Saltados: ${skipped}`);
  console.log('📊 Por herramienta:');
  for (const g of grouped) {
    console.log(`   - ${g.tool}: ${g._count._all}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
