import fs from 'fs';
import path from 'path';
import { ModelStatic, Model } from 'sequelize';
import { Player, Game, GamePlayer, Card, Score, ApiTracker } from '../../models';

/*
  Guard against the Supabase schema drifting away from the models.

  `sequelize.sync()` keeps the local database in step on its own, so a column
  added to a model works right away here and nobody notices that
  db/supabase/001_schema.sql was left behind. On Supabase that file IS the
  schema: a column missing there means a table created without it, and the
  failure only shows up in production.

  It already happened once, with `isReady`. This test makes it impossible to
  miss: add a column to a model and this fails until the SQL file has it too.
*/

const SCHEMA_PATH = path.join(__dirname, '..', '..', '..', 'db', 'supabase', '001_schema.sql');

const MODELS: ModelStatic<Model>[] = [Player, Game, GamePlayer, Card, Score, ApiTracker];

/*
  Reads the column names of each CREATE TABLE block. Table constraints and the
  closing parenthesis are skipped; everything else starts with the column name,
  quoted when it is camelCase.
*/
function columnsBySqlTable(sql: string): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  const createTable = /CREATE TABLE IF NOT EXISTS public\.(\w+)\s*\(([\s\S]*?)\n\);/g;

  let match = createTable.exec(sql);
  while (match !== null) {
    const [, tableName, body] = match;
    const columns = new Set<string>();

    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      if (line === '' || line.startsWith('--') || line.toUpperCase().startsWith('CONSTRAINT')) {
        continue;
      }
      const name = line.match(/^"([^"]+)"|^(\w+)/);
      if (name) {
        columns.add(name[1] ?? name[2]);
      }
    }

    tables.set(tableName, columns);
    match = createTable.exec(sql);
  }

  return tables;
}

describe('db/supabase/001_schema.sql matches the Sequelize models', () => {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const sqlTables = columnsBySqlTable(sql);

  it('declares every table the models use', () => {
    const modelTables = MODELS.map((model) => model.getTableName() as string).sort();
    expect([...sqlTables.keys()].sort()).toEqual(expect.arrayContaining(modelTables));
  });

  it.each(MODELS.map((model) => [model.getTableName() as string, model] as const))(
    '%s has every column declared in the model',
    (tableName, model) => {
      const attributes = model.getAttributes();
      const modelColumns = Object.entries(attributes)
        .map(([name, definition]) => definition?.field ?? name)
        .sort();

      const sqlColumns = sqlTables.get(tableName);
      expect(sqlColumns).toBeDefined();

      const missing = modelColumns.filter((column) => !sqlColumns!.has(column));
      expect(missing).toEqual([]);
    }
  );
});
