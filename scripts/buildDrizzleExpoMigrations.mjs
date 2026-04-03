import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const drizzleDir = path.join(workspaceRoot, 'drizzle');
const journalPath = path.join(drizzleDir, 'meta', '_journal.json');
const outputPath = path.join(
  workspaceRoot,
  'src',
  'infrastructure',
  'database',
  'migrations',
  'appMigrations.ts',
);

if (!fs.existsSync(journalPath)) {
  throw new Error(`Missing Drizzle journal at ${journalPath}. Run drizzle-kit generate first.`);
}

const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
const migrations = {};

for (const entry of journal.entries) {
  const key = `m${entry.idx.toString().padStart(4, '0')}`;
  const sqlPath = path.join(drizzleDir, `${entry.tag}.sql`);

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing Drizzle migration file at ${sqlPath}.`);
  }

  migrations[key] = fs.readFileSync(sqlPath, 'utf8');
}

const fileContents = `export const appMigrations = ${JSON.stringify(
  {
    journal,
    migrations,
  },
  null,
  2,
)} as const;\n`;

fs.writeFileSync(outputPath, fileContents, 'utf8');
