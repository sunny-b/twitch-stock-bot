'use strict';

require('dotenv').config()

const tmi = require('tmi.js');
const { Client } = require('pg');
const migrator = require('./migrator');
const { Store } = require('./store');
const { handleErr } = require('./helpers')
const { IEXCloudClient } = require('node-iex-cloud');
const fetch = require('node-fetch');
const { Quoter } = require ('./quoter');
const fs = require('fs');
const { StockBot } = require('./bot');


const twitchClient = new tmi.Client({
  options: { debug: true, messagesLogLevel: 'info' },
  connection: {
      reconnect: true,
      secure: true
  },
  ssl: {
    rejectUnauthorized: false,
    cert: fs.readFileSync('./ca-certificate.crt').toString(),
  },
  identity: {
      username: process.env.BOT_USERNAME,
      password: process.env.BOT_PASSWORD,
  },
  channels: ['paxosraft']
});

const db = new Client({
  connectionString: process.env.DB_CONN_STRING,
})

const iexOpts = {
  publishable: process.env.IEX_SANDBOX_API_TOKEN,
  version: 'stable'
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
if (process.env.ENVIRONMENT !== 'prod') {
  iexOpts.sandbox = true
}

const iex = new IEXCloudClient(fetch, iexOpts);

db.connect()
  .then(() => console.log('connected to database'))
  .catch(err => console.error('connection error', err.stack))

//console.log('rolling back migrations')
//migrator.rollbackAll(db).catch(e => console.log(e))

//console.log('running migrations')
//migrator.runAllMigrations(db).catch(e => handleErr(e))

const store = new Store(db)
const quoter = new Quoter(iex)

new StockBot(twitchClient, quoter, store).start()

