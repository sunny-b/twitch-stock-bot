const { handleErr } = require('./helpers')
const messages = require('./messages');
const accountRequired = {
  '!buy': true,
  '!sell': true,
  '!bailout': true,
  '!assets': true,
  '!networth': true,
  '!balance': true,
  '!history': true,
  '!remove': true
}
const adminRequired = {
    '!admin_join': true,
    '!admin_remove': true
}

class StockBot {
  constructor(twitchClient, quoter, store) {
    this.twitchClient = twitchClient
    this.quoter = quoter
    this.store = store

    this.commandCallbacks = {
      '!stockcommands': this.outputStockCommands.bind(this),
      '!join': this.addNewUser.bind(this),
      '!price': this.fetchAssetPrice.bind(this),
      '!buy': this.buyStock.bind(this),
      '!sell': this.sellStock.bind(this),
      '!bailout': this.bailoutUser.bind(this),
      '!assets': this.aggregateAssets.bind(this),
      '!networth': this.fetchCurrentNetworth.bind(this),
      '!balance': this.checkCashBalance.bind(this),
      '!history': this.getUserHistory.bind(this),
      '!remove': this.removeUser.bind(this),
      '!admin_join': this.addNewUser_Admin.bind(this),
      '!admin_remove': this.removeUser_Admin.bind(this),
    }
  }

  fetchCallback(command) {
    return this.commandCallbacks[command]
  }

  start() {
    const messageEvent = 'message';
    const connectedEvent = 'connected';

    this.twitchClient.on(messageEvent, this.onMessageHandler.bind(this));
    this.twitchClient.on(connectedEvent, this.onConnectedHandler.bind(this));

    this.twitchClient.connect().catch(e => handleErr(e))
  }

  async onMessageHandler(channel, tags, msg, self) {
    if (self || msg[0] !== '!') return;

    const args = msg.trim().toLowerCase().split(' ');
    const command = args.splice(0, 1)[0];

    const callback = this.fetchCallback(command);

    if (callback === undefined) {
      console.log(`> Unknown command ${command}`);
      return
    }

    if (accountRequired[command]) {
      if (!(await this.store.userExists(tags.username))) {
        return this.sendToChannel(channel, `@${tags.username} You must join the brokerage first. Use !join to join.`)
      }
    }

    if (adminRequired[command]) {
      if (!(await this.store.isAdmin(tags.username))) {
        return this.sendToChannel(channel, `@${tags.username} You cannot use this command.`)
      }
    }

    try {
      const message = await callback(channel, tags, args);
      if (message !== undefined) {
        this.sendToChannel(channel, `@${tags.username} ${message}`)
      }
    } catch(e) {
      this.logErr(e, channel, tags.username)
    }
  }

  async fetchAssetPrice(channel, tags, args) {
    if (args.length === 0) {
      return `You must pass in a ticker symbol.`
    }

    let ticker = args[0]

    const [ price, _ ] = await this.quoter.fetchAssetPrice(ticker)
    if (price === undefined) {
      return `${ticker.toUpperCase()} does not exist.`
    } else {
      return `${ticker.toUpperCase()}: $${price}`
    }
  }

  async addNewUser(channel, tags, args) {
    if (this.store.userExists(tags.username)) {
      return `You've already joined!`
    }

    await this.store.addUser(tags.username)
    return this.joinMsg()
  }

  async checkCashBalance(channel, tags, args) {
    let balance = await this.store.accountBalance(tags.username)
    return `Account Balance: $${balance}`
  }

  async outputStockCommands(channel, tags, args) {
    return messages.stockCommands()
  }

  async buyStock(channel, tags, args) {
    if (args.length === 0) {
      return `You must pass in a ticker symbol.`
    }

    let shares = 0;
    let ticker = '';

    if (args.length === 1) {
      ticker = args[0]
    } else {
      ticker = args[0]
      shares = +args[1]
    }

    if (shares === 0 || shares === NaN) {
      shares = 1
    }

    const [price, assetType] = await this.quoter.fetchAssetPrice(ticker)
    const currentBalance = await this.store.accountBalance(tags.username)

    if (currentBalance < (price*shares)) {
      return `You don't have enough money to buy that stock.`
    }

    await this.store.buy(tags.username, ticker, price, shares, assetType);
    return `Bought ${shares} share(s) of ${ticker.toUpperCase()} for $${price} each. Total purchase: $${price * shares}.`
  }

  async bailoutUser(channel, tags, args) {
    await this.store.deleteUser(tags.username)
    await this.store.addUser(tags.username)
    return `Here's your government stimulus check. Do better next time!`
  }

  async sellStock(channel, tags, args) {
    if (args.length === 0 || args[0].length === 0) {
      return `You must pass in a ticker symbol.`
    }

    let ticker = '';
    let shares = 0;

    if (args.length === 1) {
      ticker = args[0]
    } else {
      ticker = args[0]
      shares = +args[1]
    }

    if (shares === 0 || shares === NaN) {
      shares = 1
    }

    const ownedShares = await this.store.fetchOwnedShares(tags.username, ticker)
    if (ownedShares === 0 || shares > ownedShares) {
      return `You don't own enough shares of that stock.`
    }

    const [ price, _ ] = await this.quoter.fetchAssetPrice(ticker)
    if (price === undefined) {
      return `${ticker.toUpperCase()} does not exist.`
    }

    await this.store.sell(tags.username, ticker, price, shares)
    return `Sold ${shares} share(s) of ${ticker.toUpperCase()} for $${price} each. Total amount sold: $${price * shares}.`
  }

  async aggregateAssets(channel, tags, args) {
    const stocks = await this.store.getAssets(tags.username)
    return stocks.map((stock) => {
      return `${stock.ticker.toUpperCase()}: ${stock.shares} shares`
    }).join(' ----- ')
  }

  async fetchCurrentNetworth(channel, tags, args) {
    const cashBalance = await this.store.accountBalance(tags.username)
    const stocks = await this.store.getAssets(tags.username)
    const stockValues = []

    for (let stock of stocks) {
      const [ price, _ ] = await this.quoter.fetchAssetPrice(stock.ticker)
      const shares = stock.shares
      stockValues.push(+price * +shares)
    }

    const totalStockValue = stockValues.reduce((acc, value) => acc + value, 0)
    const totalNetworth = +totalStockValue + +cashBalance

    return `Your networth is $${totalNetworth}!`
  }

  async getUserHistory(channel, tags, args) {
    const trades = await this.store.getTradeHistory(tags.username)
    return trades.map((trade) => {
      return `${trade.type}: ${Number(trade.shares).toFixed(2)} share(s) of ${trade.ticker.toUpperCase()} for $${trade.price}`
    }).join(' ----- ')
  }

  async removeUser(channel, tags, args) {
    await this.store.deleteUser(tags.username)
    return `You have been removed from the Quorum brokerage.`
  }

  async addNewUser_Admin(channel, tags, args) {
    if (args.length === 0 || args[0].length === 0) {
      return `You must pass in a username.`
    }

    const msg = await this.store.addUser(args[0])
    return `You added user ${args[0]}`
  }

  async removeUser_Admin(channel, tags, args) {
    if (args.length === 0 || args[0].length === 0) {
      return `You must pass in a username.`
    }

    const username = args[0]

    if (!(await this.store.userExists(username))) {
      return `@${username} does not exist.`
    }

    await this.store.deleteUser(username)
    return `You have removed ${username} from the Quorum brokerage.`
  }

  onConnectedHandler(addr, port) {
    console.log(`> Connected to ${addr}:${port}`)
  }

  sendToChannel(channel, msg) {
    this.twitchClient.say(channel, msg)
  }

  joinMsg() {
    return `You have joined the Quorum brokerage. You account is currently at $100,000.00`
  }

  logErr(e, channel, username) {
    console.error(e)
    let msg = `@${username} an error occurred`
    this.sendToChannel(channel, msg)
  }
}

exports.StockBot = StockBot
