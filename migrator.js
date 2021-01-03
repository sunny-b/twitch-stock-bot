const { migrations } = require('./migrations')
const { handleErr, transaction, query } = require('./helpers')

async function init(db) {
    const migrationsTable = `CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version INT NOT NULL DEFAULT 0
    );`
    const seedMigration = `INSERT INTO migrations VALUES (1, 0) ON CONFLICT DO NOTHING`

    transaction(db, [migrationsTable, seedMigration]);
}

function getLastMigrationVersion(db) {
    const fetchVersion = `SELECT version FROM migrations LIMIT 1;`

    return query(db, fetchVersion)
      .then(res => {
          return res.rows[0].version
      })
}

async function runAllMigrations(db) {
    await init(db).catch(e => handleErr(e));

    getLastMigrationVersion(db)
        .then(version => {
            migrations.slice(version).forEach(fn => {
                runMigration(db, fn().up)
            })
    })
}

async function rollbackAll(db) {
    await init(db).catch(e => handleErr(e));

    getLastMigrationVersion(db)
        .then(version => {
            for (let i = version-1; i >= 0; i--) {
                rollback(db, migrations[i]().down)
            }
    })
}

function runMigration(db, migration) {
    const incVersion = `UPDATE migrations SET version = version + 1;`
    transaction(db, [migration, incVersion]);
}

function rollback(db, migration) {
    const decVersion = `UPDATE migrations SET version = version - 1;`
    transaction(db, [migration, decVersion]);
}


exports.runAllMigrations = runAllMigrations
exports.rollbackAll = rollbackAll
