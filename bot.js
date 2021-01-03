'use strict';

require('dotenv').config()

const tmi = require('tmi.js');
const { Client } = require('pg');
const migrator = require('./migrator');
const { Store } = require('./store');
const messageEvent = 'message';
const connectedEvent = 'connected';
const { handleErr } = require('./helpers')
const { IEXCloudClient } = require('node-iex-cloud');
const fetch = require('node-fetch');
const { StockQuoter } = require ('./stock_quoter');
const fs = require('fs');
const messages = require('./messages');

const commandCallbacks = {
  '!stockcommands': outputStockCommands,
  '!join': addNewUser,
  '!price': fetchStockPrice,
  '!buy': buyStock,
  '!sell': sellStock,
  '!bailout': bailoutUser,
  '!assets': aggregateAssets,
  '!networth': fetchCurrentNetworth,
  '!balance': checkCashBalance,
}

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
  publishable: process.env.IEX_API_TOKEN,
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
const stockQuoter = new StockQuoter(iex)

twitchClient.on(messageEvent, onMessageHandler);
twitchClient.on(connectedEvent, onConnectedHandler);

twitchClient.connect().catch(e => handleErr(e))

async function onMessageHandler(channel, tags, msg, self) {
  if (self || msg[0] !== '!') return;

  const args = msg.trim().toLowerCase().split(' ');
  const command = args.splice(0, 1)[0];

  const callback = commandCallbacks[command];

  if (callback === undefined) {
    console.log(`> Unknown command ${command}`);
    return
  }

  await callback(channel, tags, args);
}

async function fetchStockPrice(channel, tags, args) {
  if (args.length === 0) {
    sendToChannel(channel, `@${tags.username} You must pass in a ticker symbol.`)
    return
  }

  let ticker = args[0]

  if (ticker.length > 5) {
    sendToChannel(channel, `@${tags.username} ${ticker.toUpperCase()} does not exist.`)
    return
  }

  const price = await stockQuoter.fetchPrice(ticker)
  if (price === undefined) {
    sendToChannel(channel, `@${tags.username} ${ticker.toUpperCase()} does not exist.`)
  } else {
    sendToChannel(channel, `@${tags.username} ${ticker.toUpperCase()}: $${price}`)
  }
}

async function addNewUser(channel, tags, args) {
  try {
    await store.addUser(tags.username)
    sendToChannel(channel, joinMsg(tags.username))
  } catch (e) {
    let msg = `@${tags.username} an error occured`

    if (e.message.includes('duplicate key')) {
      msg = `@${tags.username} you've already joined!`
    }

    sendToChannel(channel, msg)
  }
}

async function checkCashBalance(channel, tags, args) {
  try {
    let balance = await store.accountBalance(tags.username)
    sendToChannel(channel, `@${tags.username} Account Balance: $${balance}`)
  } catch (e) {
    logErr(e, channel, tags.username)
  }
}

async function outputStockCommands(channel, tags, args) {
  try {
    sendToChannel(channel, messages.stockCommands())
  } catch (e) {
    logErr(e, channel, tags.username)
  }
}

async function buyStock(channel, tags, args) {
  let ticker
  let shares

  if (args.length === 0) {
    sendToChannel(channel, `@${tags.username} You must pass in a ticker symbol.`)
    return
  }

  if (args.length === 1) {
    ticker = args[0]
  } else {
    ticker = args[0]
    shares = +args[1]
  }

  if (shares === 0 || shares === NaN) {
    shares = 1
  }

  if (ticker.length > 5) {
    sendToChannel(channel, `@${tags.username} ${ticker.toUpperCase()} does not exist.`)
    return
  }

  const price = await stockQuoter.fetchPrice(ticker)
  const currentBalance = await store.accountBalance(tags.username)

  if (currentBalance < (price*shares)) {
    sendToChannel(channel, `@${tags.username} You don't have enough money to buy that stock.`)
    return
  }

  try {
    await store.buyStock(tags.username, ticker, price, shares);
    sendToChannel(channel, `@${tags.username} bought ${shares} share of ${ticker} for $${price} each. Total purchase: $${price * shares}.`)
  } catch (e) {
    logErr(e, channel, tags.username)
  }
}

async function bailoutUser(channel, tags, args) {
  try {
    await store.deleteUser(tags.username)
    await store.addUser(tags.username)
    sendToChannel(channel, `@${tags.username} here's your government stimulus check. Do better next time!`)
  } catch (e) {
    logErr(e, channel, tags.username)
  }
}

async function sellStock(channel, tags, args) {
  let ticker
  let shares

  if (args.length === 0) {
    sendToChannel(channel, `@${tags.username} You must pass in a ticker symbol.`)
    return
  }

  if (args.length === 1) {
    ticker = args[0]
  } else {
    ticker = args[0]
    shares = +args[1]
  }

  if (shares === 0 || shares === NaN) {
    shares = 1
  }

  if (ticker.length > 5) {
    sendToChannel(channel, `@${tags.username} ${ticker.toUpperCase()} does not exist.`)
    return
  }

  const ownedShares = await store.fetchOwnedShares(tags.username, ticker)

  if (ownedShares === 0 || shares > ownedShares) {
    sendToChannel(channel, `@${tags.username} you don't own enough shares of that stock.`)
    return
  }

  const price = await stockQuoter.fetchPrice(ticker)
  if (price === undefined) {
    sendToChannel(channel, `@${tags.username} ${ticker.toUpperCase()} does not exist.`)
    return
  }

  try {
    await store.sellStock(tags.username, ticker, price, shares)
    sendToChannel(channel, `@${tags.username} sold ${shares} share of ${ticker} for $${price} each. Total amount sold: $${price * shares}.`)
  } catch(e) {
    logErr(e, channel, tags.username)
  }
}

async function aggregateAssets(channel, tags, args) {
  if (!store.userExists(tags.username)) {
    sendToChannel(channel, `@${tags.username} You must join the brokerage first. Use !join to join.`)
    return
  }

  try {
    const stocks = await store.getStocks(tags.username)
    const stockMsg = `@${tags.username} ` + stocks.map((stock) => {
      return `${stock.ticker.toUpperCase()}: ${stock.shares} shares`
    }).join(' ----- ')
    sendToChannel(channel, stockMsg)
  } catch(e) {
    logErr(e, channel, tags.username)
  }
}

async function fetchCurrentNetworth(channel, tags, args) {
  if (!store.userExists(tags.username)) {
    sendToChannel(channel, `@${tags.username} You must join the brokerage first. Use !join to join.`)
    return
  }

  try {
    const cashBalance = await store.accountBalance(tags.username)
    const stocks = await store.getStocks(tags.username)
    const stockValues = []

    for (let stock of stocks) {
      const price = await stockQuoter.fetchPrice(stock.ticker)
      const shares = stock.shares
      stockValues.push(+price * +shares)
    }

    const totalStockValue = stockValues.reduce((acc, value) => acc + value, 0)
    const totalNetworth = +totalStockValue + +cashBalance

    sendToChannel(channel, `@${tags.username} Your networth is $${totalNetworth}!`)
  } catch (e) {
    logErr(e)
  }
}

function onConnectedHandler(addr, port) {
  console.log(`> Connected to ${addr}:${port}`)
}

function sendToChannel(channel, msg) {
  twitchClient.say(channel, msg)
}

function joinMsg(username) {
  return `@${username} You have joined the Quorum brokerage. You account is currently at $10,000.00`
}

function logErr(e, channel, username) {
  console.log(e)
  let msg = `@${username} an error occurred`
  sendToChannel(channel, msg)
}
