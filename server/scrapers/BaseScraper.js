class BaseScraper {
  constructor(supermarket, io) {
    this.supermarket = supermarket;
    this.io = io;
  }

  /**
   * Main scrape method. Must be implemented by subclasses.
   * @param {object} page - Playwright page object
   * @returns {Promise<object>} - Result object containing { products, promos }
   */
  async scrape(page) {
    throw new Error('Method "scrape" must be implemented');
  }

  emitStatus(status) {
    if (this.io) {
      this.io.emit('storeStatus', { storeId: this.supermarket.id, status });
    }
  }

  log(message) {
    console.log(`[${this.supermarket.name}] ${message}`);
  }

  error(message, err) {
    console.error(`[${this.supermarket.name}] ${message}`, err);
  }
}

module.exports = BaseScraper;
