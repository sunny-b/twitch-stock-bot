const { handleErr } = require('./helpers')

class Store {
    constructor(db) {
        this.db = db;
    }

    async userExists(username) {
        const userExistsQ = `SELECT 1 AS exists FROM users WHERE name = $1;`

        try {
            const res = await this.db.query(userExistsQ, [username])
            return res.rows.length > 0
        } catch (e) {
            console.log(e)
            throw e
        }

    }

    async addUser(username) {
        const insertUserQ = `INSERT INTO users (name) VALUES ($1);`
        const insertAccountQ = `INSERT INTO accounts (username) VALUES ($1);`

        try {
            await this.db.query(`BEGIN`)
            await this.db.query(insertUserQ, [username])
            await this.db.query(insertAccountQ, [username])
            await this.db.query(`COMMIT`)
        } catch (e) {
            await this.db.query(`ROLLBACK`)
            console.log(e)
            throw e
        }
    }

    async accountBalance(username) {
        const balanceQ = `SELECT balance FROM accounts WHERE username = $1;`

        try {
            const res = await this.db.query(balanceQ, [username])
            return res.rows[0].balance
        } catch (e) {
            console.log(e)
        }
    }

    async buyStock(username, ticker, price, shares) {
        let ownedStockQ = `INSERT INTO owned_stocks (username, ticker, shares) VALUES ($1, $2, $3) ON CONFLICT (username, ticker) DO UPDATE SET shares = owned_stocks.shares + $3;`
        let tradesQ = `INSERT INTO trades (username, ticker, price, shares, type) VALUES ($1, $2, $3, $4, 'buy');`
        let accountQ = `UPDATE accounts SET balance = (balance - $1) WHERE username = $2;`

        try {
            await this.db.query(`BEGIN`)
            await this.db.query(ownedStockQ, [username, ticker, shares])
            await this.db.query(tradesQ, [username, ticker, price, shares])
            await this.db.query(accountQ, [(shares*price), username])
            await this.db.query(`COMMIT`)
        } catch(e) {
            await this.db.query(`ROLLBACK`)
            console.log(e)
            throw e
        }
    }

    async deleteUser(username) {
        let deleteUserQ = `DELETE FROM users WHERE name = $1;`

        try {
            await this.db.query(deleteUserQ, [username])
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async fetchOwnedShares(username, ticker) {
        let selectStockQ = `SELECT shares FROM owned_stocks WHERE username = $1;`

        try {
            const res = await this.db.query(selectStockQ, [username])
            if (res.rows.length > 0) {
                return res.rows[0].shares
            }
            return 0
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async sellStock(username, ticker, price, shares) {
        let ownedStockQ = `UPDATE owned_stocks SET shares=(shares - $1) WHERE username = $2 AND ticker = $3;`
        let tradesQ = `INSERT INTO trades (username, ticker, price, shares, type) VALUES ($1, $2, $3, $4, 'sell');`
        let accountQ = `UPDATE accounts SET balance = (balance + $1) WHERE username = $2;`

        try {
            await this.db.query(`BEGIN`)
            await this.db.query(ownedStockQ, [shares, username, ticker])
            await this.db.query(tradesQ, [username, ticker, price, shares])
            await this.db.query(accountQ, [(shares*price), username])
            await this.db.query(`COMMIT`)
        } catch(e) {
            await this.db.query(`ROLLBACK`)
            console.log(e)
            throw e
        }
    }

    async getStocks(username) {
        const getStocksQ = `SELECT ticker, shares FROM owned_stocks WHERE username = $1;`

        try {
            const res = await this.db.query(getStocksQ, [username])
            return res.rows.map((row) => {
                return { ticker: row.ticker, shares: row.shares }
            })
        } catch(e) {
            console.log(e)
            throw e
        }
    }
}

exports.Store = Store
