function stockCommands() {
  return `!join: Join the Quorum Brokerage
-------
!price <stock ticker>: Check the price of a certain stock
-------
!buy <stock ticker> <shares>: Buy a certain number of shares of a stock (shares default to 1)
-------
!sell <stock ticker> <shares>: Sell a certain number of shares of a stock (shares default to 1)
-------
!balance: Check your current brokerage account balance
-------
!bailout: Get bailed out and reset your account
-------
!assets: Display which stocks and crypto coins you own
`
}

exports.stockCommands = stockCommands
