class Quoter {
    constructor(client) {
        this.client = client
    }

    async fetchStockPrice(ticker) {
      return await this.client
          .symbol(ticker)
          .quote()
          .then(res => res.latestPrice)
          .catch(e => { throw e })
    }

    // IEX's "crypto" endpoint is able to get prices for both
    // stock and crypto assets
    async fetchAssetPrice(symbol) {
      return await this.client
          .crypto(symbol)
          .quote()
          .then(res => {
            return [res.latestPrice, (res.sector === 'cryptocurrency' ? 'crypto' : 'stock')]
          })
          .catch(e => { throw e })
    }
}

exports.Quoter = Quoter
