// Postinstall fix para Prisma 6.16+ con pnpm 11
// 1) Parchea el default.js/.d.ts de @prisma/client para que el require
//    relativo apunte a 2 niveles arriba (../../.prisma/client/default).
// 2) Actualiza el tsconfig.json con el path real al cliente generado,
//    porque el hash de pnpm cambia en cada instalación.
const fs = require('fs');
const path = require('path');

const root = path.join(process.cwd(), 'node_modules', '.pnpm');

// --- 1) Encontrar el directorio real de @prisma+client ---
const clientDir = fs
  .readdirSync(root)
  .filter((d) => d.startsWith('@prisma+client@'))
  .map((d) => path.join(root, d, 'node_modules', '@prisma', 'client'))
  .find((p) => fs.existsSync(p));

if (!clientDir) {
  console.log('postinstall-fix: @prisma/client no encontrado, saltando fix');
  process.exit(0);
}

const generatedIndex = path.join(clientDir, '..', '..', '.prisma', 'client', 'index.d.ts');

// --- 2) Parchear default.js y default.d.ts ---
let patched = 0;
for (const file of ['default.js', 'default.d.ts']) {
  const p = path.join(clientDir, file);
  if (!fs.existsSync(p)) continue;
  let c = fs.readFileSync(p, 'utf-8');
  const before = c;
  c = c.replace(/(['"])\.prisma\/client\//g, '$1../../.prisma/client/');
  c = c.replace(/(['"])\.\/\.prisma\/client\//g, '$1../../.prisma/client/');
  if (c !== before) {
    fs.writeFileSync(p, c);
    console.log('✔ Patched:', path.relative(process.cwd(), p));
    patched++;
  }
}

// --- 3) Actualizar tsconfig.json con el path correcto ---
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
if (fs.existsSync(tsconfigPath) && fs.existsSync(generatedIndex)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
  const compilerOptions = (tsconfig.compilerOptions ||= {});
  compilerOptions.paths = compilerOptions.paths || {};

  // Apuntamos al index generado directamente
  const relPath = path.relative(process.cwd(), generatedIndex).replace(/\\/g, '/');
  const basePath = relPath.replace(/index\.d\.ts$/, '');
  compilerOptions.paths['@prisma/client'] = [`./${relPath}`];
  compilerOptions.paths['@prisma/client/*'] = [`./${basePath}*`];

  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  console.log('✔ Updated tsconfig.json paths');
}

if (patched === 0) console.log('postinstall-fix: nada que parchear (ya estaba OK)');
