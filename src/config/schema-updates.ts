import { QueryTypes, Sequelize } from 'sequelize';

/*
  O projeto ainda nao usa uma ferramenta de migracao: o esquema e criado por
  `sequelize.sync()`, que cria tabelas novas mas nao adiciona colunas em
  tabelas que ja existem. Este passo cobre exatamente essa lacuna para as
  colunas adicionadas depois que o banco de alguem ja estava criado.

  Cada instrucao precisa ser idempotente, porque roda em toda inicializacao.
  Quando o time adotar migracoes de verdade, este arquivo pode sair.
*/
const PENDING_COLUMNS: Array<{ table: string; column: string; definition: string }> = [
  {
    table: 'game_players',
    column: 'saidUno',
    definition: 'BOOLEAN NOT NULL DEFAULT false',
  },
];

export async function applyPendingColumns(sequelize: Sequelize): Promise<void> {
  for (const { table, column, definition } of PENDING_COLUMNS) {
    const [existing] = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*) AS count
         FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column`,
      { replacements: { table, column }, type: QueryTypes.SELECT }
    );

    if (Number(existing?.count ?? 0) > 0) {
      continue;
    }

    await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
    console.log(`Added missing column ${table}.${column}`);
  }
}
