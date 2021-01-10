class Quoter {
    constructor(client) {
        this.client = client
    }

    async fetchStockPrice(ticker) {
      try {
        return await this.client
            .symbol(ticker)
            .quote()
            .then(res => res.latestPrice)
            .catch(e => { throw e })
      } catch (e) {
        console.log(e)
      }
    }

    async fetchCryptoPrice(symbol) {
      try {
        return await this.client
            .crypto(symbol)
            .quote()
            .then(res => res.latestPrice)
            .catch(e => { throw e })
      } catch (e) {
        console.log(e)
      }
    }
}

exports.Quoter = Quoter
