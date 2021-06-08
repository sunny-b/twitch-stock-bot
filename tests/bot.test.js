const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
const { StockBot } = require("../bot");

describe('StockBot', () => {
  var bot;
  var twitchClient;

  beforeEach(() => {
    twitchClient = {
      say: function() {}
    }
  })

  describe('onMessageHandler', () => {
    var store
    var storeMock;
    var clientMock;

    beforeEach(() => {
      store = {
        isAdmin: function() {},
        userExists: function() {}
      }
      storeMock = sinon.mock(store)
      clientMock = sinon.mock(twitchClient)
      bot = new StockBot(twitchClient, null, store)
    })

    it('should return and not call a callback if self is true', async () => {
      sinon.spy(bot, 'addNewUser')

      await bot.onMessageHandler('paxosraft', {}, '!join', true)

      expect(bot.addNewUser.calledOnce).to.be.false;
    })

    it('should return and not call a callback if msg is not a command', async () => {
      sinon.spy(bot, 'addNewUser')

      await bot.onMessageHandler('paxosraft', {}, 'join', false)

      expect(bot.addNewUser.calledOnce).to.be.false;
    })

    it('should send error to channel if admin command is called by non-admin', async () => {
      storeMock.expects('isAdmin').once().withArgs('paxosraft').returns(false)
      clientMock.expects('say').once().withArgs('paxosraft', sinon.match("You cannot use this command"))
      sinon.spy(bot, 'addNewUser_Admin')

      await bot.onMessageHandler('paxosraft', {username: 'paxosraft'}, '!admin_join', false)

      expect(bot.addNewUser_Admin.calledOnce).to.be.false;
    })

    it('should send error to channel if command is called by non-registered user', async () => {
      storeMock.expects('userExists').once().withArgs('paxosraft').returns(false)
      clientMock.expects('say').once().withArgs('paxosraft', sinon.match("You must join"))
      sinon.spy(bot, 'buyStock')

      await bot.onMessageHandler('paxosraft', {username: 'paxosraft'}, '!buy', false)

      expect(bot.buyStock.calledOnce).to.be.false;
    })

    it('calls the callback function', async () => {
      sinon.stub(bot, 'fetchCallback').returns(async () => { return "hello, world!" })
      clientMock.expects('say').once().withArgs('paxosraft', sinon.match("hello, world!"))

      await bot.onMessageHandler('paxosraft', {username: 'paxosraft'}, '!price', false)
    })

    it('sends error to channel if callback throws an error', async () => {
      sinon.stub(bot, 'fetchCallback').returns(async () => { throw new Error("error") })
      clientMock.expects('say').once().withArgs('paxosraft', sinon.match("an error occurred"))

      await bot.onMessageHandler('paxosraft', {username: 'paxosraft'}, '!price', false)
    })

    afterEach(() => {
      storeMock.verify()
      clientMock.verify()
    })
  })

  describe('fetchAssetPrice', () => {
    var quoter;
    var quoterMock;

    beforeEach(() => {
      quoter = {
        fetchAssetPrice: function() {}
      }
      quoterMock = sinon.mock(quoter)
      bot = new StockBot(twitchClient, quoter, null)
    })

    afterEach(() => { quoterMock.verify() })

    it('sends error message to channel if no symbol', async () => {
      const msg = await bot.fetchAssetPrice('paxosraft', {username: "paxosraft"}, [])
      expect(msg).to.include("You must pass in a ticker symbol")
    })

    it('sends error message to channel if price is undefined', async () => {
      quoterMock.expects('fetchAssetPrice').once().withArgs('tsla').returns(undefined)

      const msg = await bot.fetchAssetPrice('paxosraft', {username: "paxosraft"}, ['tsla'])
      expect(msg).to.include("does not exist")
    })

    it('sends price to channel if price is returned', async () => {
      quoterMock.expects('fetchAssetPrice').once().withArgs('tsla').returns(50)

      const msg = await bot.fetchAssetPrice('paxosraft', {username: "paxosraft"}, ['tsla'])
      expect(msg).to.include("$50")
    })
  })

  describe('addNewUser', () => {
    var store
    var storeMock;

    beforeEach(() => {
      store = {
        addUser: function() {},
        userExists: function() {}
      }
      storeMock = sinon.mock(store)
      bot = new StockBot(twitchClient, null, store)
    })

    afterEach(() => { storeMock.verify() })

    it('sends already joined error message to channel if user already exists', async () => {
      storeMock.expects('userExists').once().withArgs('paxosraft').returns(true)
      const msg = await bot.addNewUser('paxosraft', {username: "paxosraft"}, [])

      expect(msg).to.include("You've already joined")
    })

    it('sends successful message to the channel', async () => {
      storeMock.expects('userExists').once().withArgs('paxosraft').returns(false)
      storeMock.expects('addUser').once().withArgs('paxosraft')
      const msg = await bot.addNewUser('paxosraft', {username: "paxosraft"}, [])

      expect(msg).to.include(joinMsg())
    })
  })

  describe('checkCashBalance', () => {
    var store
    var storeMock;

    beforeEach(() => {
      store = {
        accountBalance: function() {}
      }
      storeMock = sinon.mock(store)
      bot = new StockBot(twitchClient, null, store)
    })

    afterEach(() => { storeMock.verify() })

    it('sends account balance to the channel', async () => {
      storeMock.expects('accountBalance').once().withArgs('paxosraft').returns(1000)
      const msg = await bot.checkCashBalance('paxosraft', {username: "paxosraft"}, [])

      expect(msg).to.include("$1000")
    })
  })

  describe('buyStock', () => {
    var quoter;
    var quoterMock;
    var store;
    var storeMock;

    beforeEach(() => {
      quoter = {
        fetchAssetPrice: function() {}
      }
      quoterMock = sinon.mock(quoter)
      store = {
        accountBalance: function() {},
        buy: function() {}
      }
      storeMock = sinon.mock(store)
      bot = new StockBot(twitchClient, quoter, store)
    })

    afterEach(() => {
      quoterMock.verify()
      storeMock.verify()
    })

    it('sends error message to channel if no symbol', async () => {
      const msg = await bot.buyStock('paxosraft', {username: "paxosraft"}, [])
      expect(msg).to.include("You must pass in a ticker symbol")
    })

    it('sends error message to channel if not enough funds', async () => {
      quoterMock.expects('fetchAssetPrice').once().withArgs('tsla').returns([10, 'stock'])
      storeMock.expects('accountBalance').once().withArgs('paxosraft').returns(5)

      const msg =await bot.buyStock('paxosraft', {username: "paxosraft"}, ['tsla'])
      expect(msg).to.include("You don't have enough money")
    })

    it('sends successful purchase message if buy is successful', async () => {
      quoterMock.expects('fetchAssetPrice').once().withArgs('tsla').returns([10, 'stock'])
      storeMock.expects('accountBalance').once().withArgs('paxosraft').returns(15)
      storeMock.expects('buy').once().withArgs('paxosraft', 'tsla', 10, 1, 'stock')

      const msg = await bot.buyStock('paxosraft', {username: "paxosraft"}, ['tsla'])
      expect(msg).to.include("Total purchase: $10")
    })

    it('buying multiple shares multiplies total purchase price', async () => {
      quoterMock.expects('fetchAssetPrice').once().withArgs('tsla').returns([10, 'stock'])
      storeMock.expects('accountBalance').once().withArgs('paxosraft').returns(40)
      storeMock.expects('buy').once().withArgs('paxosraft', 'tsla', 10, 2, 'stock')

      const msg = await bot.buyStock('paxosraft', {username: "paxosraft"}, ['tsla', '2'])
      expect(msg).to.include("Total purchase: $20")
    })

    it('buying multiple shares fails if not enough funds', async () => {
      quoterMock.expects('fetchAssetPrice').once().withArgs('tsla').returns([10, 'stock'])
      storeMock.expects('accountBalance').once().withArgs('paxosraft').returns(40)

      const msg = await bot.buyStock('paxosraft', {username: "paxosraft"}, ['tsla', '5'])
      expect(msg).to.include("You don't have enough money")
    })

    it('can buy crypto assets', async () => {
      quoterMock.expects('fetchAssetPrice').once().withArgs('btcusd').returns([10, 'crypto'])
      storeMock.expects('accountBalance').once().withArgs('paxosraft').returns(40)
      storeMock.expects('buy').once().withArgs('paxosraft', 'btcusd', 10, 1, 'crypto')

      const msg = await bot.buyStock('paxosraft', {username: "paxosraft"}, ['btcusd', '1'])
      expect(msg).to.include("Bought 1 share(s) of BTCUSD for $10 each. Total purchase: $10")
    })
  })

  describe('bailoutUser', () => {
    var store;
    var storeMock;

    beforeEach(() => {
      store = {
        deleteUser: function() {},
        addUser: function() {}
      }
      storeMock = sinon.mock(store)
      bot = new StockBot(twitchClient, null, store)
    })

    it('returns a successful message to user', async () => {
      storeMock.expects('deleteUser').once().withArgs('paxosraft')
      storeMock.expects('addUser').once().withArgs('paxosraft')

      const msg = await bot.bailoutUser('paxosraft', {username: "paxosraft"}, [])
      expect(msg).to.include("Do better next time")
    })

    afterEach(() => {
      storeMock.verify()
    })
  })

  describe('sellStock', () => {
    var store;
    var storeMock;
    var quoter;
    var quoterMock;

    beforeEach(() => {
      store = {
        fetchOwnedShares: function() {},
        sell: function() {}
      }
      storeMock = sinon.mock(store)
      quoter = {
        fetchAssetPrice: function() {}
      }
      quoterMock = sinon.mock(quoter)
      bot = new StockBot(twitchClient, quoter, store)
    })

    it('returns error string if ticker is empty', async () => {
      const message = await bot.sellStock('paxosraft', {username: "paxosraft"}, [''])
      expect(message).to.include('must pass in a ticker symbol')
    })

    it('returns error string if no ticker', async () => {
      const message = await bot.sellStock('paxosraft', {username: "paxosraft"}, [])
      expect(message).to.include('must pass in a ticker symbol')
    })

    it('returns error string if owned shares amount is 0', async () => {
      storeMock.expects('fetchOwnedShares').once().withArgs('paxosraft').returns(0)
      const message = await bot.sellStock('paxosraft', {username: "paxosraft"}, ['tsla', 1])
      expect(message).to.include("don't own enough shares")
    })

    it('returns error string if owned shares is less than sell amount', async () => {
      storeMock.expects('fetchOwnedShares').once().withArgs('paxosraft').returns(1)
      const message = await bot.sellStock('paxosraft', {username: "paxosraft"}, ['tsla', 3])
      expect(message).to.include("don't own enough shares")
    })

    it('successfully sells shares, even if don\'t pass in share amount', async () => {
      storeMock.expects('fetchOwnedShares').once().withArgs('paxosraft').returns(1)
      storeMock.expects('sell').once().withArgs('paxosraft', 'tsla', 10, 1)
      quoterMock.expects('fetchAssetPrice').once().withArgs('tsla').returns([10, 'stock'])
      const message = await bot.sellStock('paxosraft', {username: "paxosraft"}, ['tsla'])
      expect(message).to.include("Sold 1 share(s) of TSLA for $10 each. Total amount sold: $10")
    })

    it('can successfully sell multiple shares', async () => {
      storeMock.expects('fetchOwnedShares').once().withArgs('paxosraft').returns(2)
      storeMock.expects('sell').once().withArgs('paxosraft', 'tsla', 10, 2)
      quoterMock.expects('fetchAssetPrice').once().withArgs('tsla').returns([10, 'stock'])
      const message = await bot.sellStock('paxosraft', {username: "paxosraft"}, ['tsla', 2])
      expect(message).to.include("Sold 2 share(s) of TSLA for $10 each. Total amount sold: $20")
    })

    afterEach(() => {
      storeMock.verify()
      quoterMock.verify()
    })
  })

  describe('fetchCurrentNetworth', () => {
    var store;
    var storeMock;
    var quoter;
    var quoterMock;

    beforeEach(() => {
      store = {
        userExists: function() {},
        accountBalance: function() {},
        getAssets: function() {}
      }
      storeMock = sinon.mock(store)
      quoter = {
        fetchAssetPrice: function() {},
      }
      quoterMock = sinon.mock(quoter)
      bot = new StockBot(twitchClient, quoter, store)
    })

    it('returns total networth for both stock, crypto and cash -- including fractional shares', async () => {
      storeMock.expects('accountBalance').once().withArgs('paxosraft').returns(1000)
      storeMock.expects('getAssets').once().withArgs('paxosraft').returns([{
        assettype: 'stock',
        ticker: 'tsla',
        shares: '100'
      }, {
        assettype: 'crypto',
        ticker: 'btcusd',
        shares: '0.56'
      }])
      quoterMock.expects('fetchAssetPrice').once().withArgs('tsla').returns(50)
      quoterMock.expects('fetchAssetPrice').once().withArgs('btcusd').returns(10000)
      const message = await bot.fetchCurrentNetworth('paxosraft', {username: "paxosraft"}, [])
      expect(message).to.include("$11600")
    })

    afterEach(() => {
      storeMock.verify()
      quoterMock.verify()
    })
  })

  describe('getUserHistory', () => {
    var store;
    var storeMock;

    beforeEach(() => {
      store = {
        userExists: function() {},
        getTradeHistory: function() {}
      }
      storeMock = sinon.mock(store)
      bot = new StockBot(twitchClient, null, store)
    })

    afterEach(() => {
      storeMock.verify()
    })

    it('returns the a user\'s trading history', async () => {
      storeMock.expects('getTradeHistory').once().withArgs('paxosraft').returns([{
        type: 'stock',
        ticker: 'tsla',
        shares: '100',
        price: '10.56'
      }, {
        type: 'crypto',
        ticker: 'btcusd',
        shares: '0.56',
        price: '10000'
      }])
      const message = await bot.getUserHistory('paxosraft', {username: "paxosraft"}, [])
      expect(message).to.include("stock: 100.00 share(s) of TSLA for $10.56 ----- crypto: 0.56 share(s) of BTCUSD for $10000")
    })
  })

  describe('removeUser', () => {
    var store;
    var storeMock;

    beforeEach(() => {
      store = {
        userExists: function() {},
        deleteUser: function() {}
      }
      storeMock = sinon.mock(store)
      bot = new StockBot(twitchClient, null, store)
    })

    afterEach(() => {
      storeMock.verify()
    })

    it('removes the user', async () => {
      storeMock.expects('deleteUser').once().withArgs('paxosraft')
      const message = await bot.removeUser('paxosraft', {username: "paxosraft"}, [])
      expect(message).to.include("You have been removed")
    })
  })

  describe('addNewUser_Admin', () => {
    var store
    var storeMock;

    beforeEach(() => {
      store = {
        addUser: function() {},
        isAdmin: function() {}
      }
      storeMock = sinon.mock(store)
      bot = new StockBot(twitchClient, null, store)
    })

    afterEach(() => { storeMock.verify() })

    it('returns error msg if no arguments passed in', async () => {
      const msg = await bot.addNewUser_Admin('paxosraft', {username: "paxosraft"}, [])

      expect(msg).to.include("You must pass in a username")
    })

    it('returns error msg if name passed in is empty', async () => {
      const msg = await bot.addNewUser_Admin('paxosraft', {username: "paxosraft"}, [''])

      expect(msg).to.include("You must pass in a username")
    })

    it('returns successful msg and adds user', async () => {
      storeMock.expects('addUser').once().withArgs('newUser')
      const msg = await bot.addNewUser_Admin('paxosraft', {username: "paxosraft"}, ['newUser'])

      expect(msg).to.include("You added user newUser")
    })
  })

  describe('removeNewUser_Admin', () => {
    var store
    var storeMock;

    beforeEach(() => {
      store = {
        deleteUser: function() {},
        userExists: function() {},
        isAdmin: function() {}
      }
      storeMock = sinon.mock(store)
      bot = new StockBot(twitchClient, null, store)
    })

    afterEach(() => { storeMock.verify() })

    it('returns error msg if no arguments passed in', async () => {
      const msg = await bot.removeUser_Admin('paxosraft', {username: "paxosraft"}, [])

      expect(msg).to.include("You must pass in a username")
    })

    it('returns error msg if name passed in is empty', async () => {
      const msg = await bot.removeUser_Admin('paxosraft', {username: "paxosraft"}, [''])

      expect(msg).to.include("You must pass in a username")
    })

    it('returns error msg if user doesn\'t exist', async () => {
      storeMock.expects('userExists').once().withArgs('newUser').returns(false)
      const msg = await bot.removeUser_Admin('paxosraft', {username: "paxosraft"}, ['newUser'])

      expect(msg).to.include("@newUser does not exist")
    })

    it('returns successful msg and adds user', async () => {
      storeMock.expects('userExists').once().withArgs('newUser').returns(true)
      storeMock.expects('deleteUser').once().withArgs('newUser')
      const msg = await bot.removeUser_Admin('paxosraft', {username: "paxosraft"}, ['newUser'])

      expect(msg).to.include("You have removed newUser")
    })
  })
})

function joinMsg() {
  return `You have joined the Quorum brokerage. You account is currently at $10,000.00`
}
