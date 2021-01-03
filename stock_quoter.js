class StockQuoter {
    constructor(client) {
        this.client = client
    }

    async fetchPrice(ticker) {
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
}

exports.StockQuoter = StockQuoter
