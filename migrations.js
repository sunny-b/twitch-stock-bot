let migrations = [
    createUsersTable,
    createAccountsTable,
    createStockTradeTypeEnum,
    createTradesTable,
    createOwnedStocksTable
]

function createUsersTable() {
    const up = `CREATE TABLE IF NOT EXISTS users (
        name VARCHAR(255) PRIMARY KEY,
        id SERIAL NOT NULL UNIQUE,
        is_admin bool DEFAULT false,
        created_at TIMESTAMP NOT NULL
            DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL
            DEFAULT CURRENT_TIMESTAMP
    );`

    const down = `DROP TABLE IF EXISTS users;`

    return { up, down }
}

function createAccountsTable() {
    const up = `CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        balance NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
        created_at TIMESTAMP NOT NULL
            DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL
            DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username)
            REFERENCES users(name)
            ON DELETE CASCADE
    );`

    const down = `DROP TABLE IF EXISTS accounts;`

    return { up, down }
}

function createStockTradeTypeEnum() {
    const up = `CREATE TYPE stock_trade AS ENUM ('buy', 'sell');`
    const down = `DROP TYPE IF EXISTS stock_trade;`

    return { up, down }

}

function createTradesTable() {
    const up = `CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        ticker VARCHAR(5) NOT NULL,
        shares INT NOT NULL,
        price NUMERIC(8, 2) NOT NULL,
        type stock_trade NOT NULL,
        created_at TIMESTAMP NOT NULL
            DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username)
            REFERENCES users(name)
            ON DELETE CASCADE
    );`

    const down = `DROP TABLE IF EXISTS trades;`

    return { up, down }
}

function createOwnedStocksTable() {
    const up = `CREATE TABLE IF NOT EXISTS owned_stocks (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        ticker VARCHAR(5) NOT NULL,
        shares INT NOT NULL,
        created_at TIMESTAMP NOT NULL
            DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL
            DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username)
            REFERENCES users(name)
            ON DELETE CASCADE,
        UNIQUE (username, ticker)
    );`

    const down = `DROP TABLE IF EXISTS owned_stocks;`

    return { up, down }
}

exports.migrations = migrations
