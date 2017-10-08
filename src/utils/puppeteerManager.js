const puppeteer = require("puppeteer");

class puppeteerManagerClass {
  initial = async () => {
    this.browser = await puppeteer.launch({ headless: false });
  };
  getNewPage = async (url, options = { waitUntil: "networkidle" }) => {
    const page = await this.browser.newPage();
    await page.goto(url, options);
    return page;
  };

  closePage(page) {
    page.close();
  }
}

const puppeteerManager = new puppeteerManagerClass();

module.exports = puppeteerManager;
