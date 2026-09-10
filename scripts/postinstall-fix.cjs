// Postinstall: parchea el default.js/.d.ts de @prisma/client para que
// el require relativo funcione correctamente con el layout de pnpm 11.
// Este bug está en Prisma 6.16+. Cuando actualicen y lo arreglen,
// este script pasa a ser no-op porque no encuentra el patrón a parchear.
const fs = require('fs');
const path = require('path');

const clientDirs = fs
  .readdirSync(path.join(process.cwd(), 'node_modules', '.pnpm'))
  .filter((d) => d.startsWith('@prisma+client@'))
  .map((d) =>
    path.join(process.cwd(), 'node_modules', '.pnpm', d, 'node_modules', '@prisma', 'client'),
  );

let patched = 0;
for (const dir of clientDirs) {
  for (const file of ['default.js', 'default.d.ts']) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) continue;
    let c = fs.readFileSync(p, 'utf-8');
    const before = c;
    // Si apunta a un path de 0 o 1 nivel arriba y existe el archivo
    // en dos niveles arriba, lo arreglamos.
    c = c.replace(/(['"])\.prisma\/client\//g, "$1../../.prisma/client/");
    c = c.replace(/(['"])\.\/\.prisma\/client\//g, "$1../../.prisma/client/");
    if (c !== before) {
      fs.writeFileSync(p, c);
      console.log('✔ Patched:', path.relative(process.cwd(), p));
      patched++;
    }
  }
}
if (patched === 0) console.log('postinstall-fix: nada que parchear');
