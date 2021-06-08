let migrations = [
    createUsersTable,
    createAccountsTable,
    createStockTradeTypeEnum,
    createTradesTable,
    createOwnedStocksTable,
    extendTickerCharLength,
    extendTickerCharLengthTrades,
    alterSharesDataTypeOwnedStocks,
    alterSharesDataTypeTrades,
    alterSharesDataTypeOwnedStocksAgain,
    alterSharesDataTypeTradesAgain,
    createAssetTypeEnum,
    addTypeColumnOwnedStocks,
    addTypeColumnOwnedTrades,
    updateDefaultAccountBalance,
    updateAllUserAccounts,
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

function extendTickerCharLength() {
    const up = `ALTER TABLE owned_stocks ALTER COLUMN ticker TYPE VARCHAR(20);`
    const down = `ALTER TABLE owned_stocks ALTER COLUMN ticker TYPE VARCHAR(5);`
    return { up, down }
}

function extendTickerCharLengthTrades() {
    const up = `ALTER TABLE trades ALTER COLUMN ticker TYPE VARCHAR(20);`
    const down = `ALTER TABLE trades ALTER COLUMN ticker TYPE VARCHAR(5);`
    return { up, down }
}

function alterSharesDataTypeOwnedStocks() {
    const up = `ALTER TABLE owned_stocks ALTER COLUMN shares TYPE NUMERIC(8, 2);`
    const down = `ALTER TABLE owned_stocks ALTER COLUMN shares TYPE INT;`
    return { up, down }
}

function alterSharesDataTypeTrades() {
    const up = `ALTER TABLE trades ALTER COLUMN shares TYPE NUMERIC(8, 2);`
    const down = `ALTER TABLE trades ALTER COLUMN shares TYPE INT;`
    return { up, down }
}

function alterSharesDataTypeOwnedStocksAgain() {
    const up = `ALTER TABLE owned_stocks ALTER COLUMN shares TYPE NUMERIC(30, 15);`
    const down = `ALTER TABLE owned_stocks ALTER COLUMN shares TYPE INT;`
    return { up, down }
}

function alterSharesDataTypeTradesAgain() {
    const up = `ALTER TABLE trades ALTER COLUMN shares TYPE NUMERIC(30, 15);`
    const down = `ALTER TABLE trades ALTER COLUMN shares TYPE INT;`
    return { up, down }
}

function createAssetTypeEnum() {
    const up = `CREATE TYPE asset AS ENUM ('stock', 'crypto');`
    const down = `DROP TYPE IF EXISTS asset;`

    return { up, down }
}

function addTypeColumnOwnedStocks() {
    const up = `ALTER TABLE owned_stocks ADD COLUMN asset_type asset DEFAULT 'stock';`
    const down = `ALTER TABLE owned_stocks DROP COLUMN type;`
    return { up, down }
}

function addTypeColumnOwnedTrades() {
    const up = `ALTER TABLE trades ADD COLUMN asset_type asset DEFAULT 'stock';`
    const down = `ALTER TABLE trades DROP COLUMN type;`
    return { up, down }
}

function updateDefaultAccountBalance() {
    const up = `ALTER TABLE accounts ALTER COLUMN balance SET DEFAULT 100000.00;`
    const down = `ALTER TABLE accounts ALTER COLUMN balance SET DEFAULT 10000.00;`
    return { up, down }
}

function updateAllUserAccounts() {
    const up = `UPDATE accounts SET balance=balance+90000;`
    const down = `UPDATE accounts SET balance=balance-90000;`
    return { up, down }
}

exports.migrations = migrations
