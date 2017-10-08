require("es6-promise").polyfill();
require("isomorphic-fetch");
const _ = require("lodash");
const puppeteer = require("puppeteer");
const mongoManager = require("../utils/mongoManager");
const queryString = require("query-string");
const URI = require("urijs");
const amqpManager = require("../utils/amqpManager");
const puppeteerManager = require("../utils/puppeteerManager");

async function checkPchomeCatogery() {
  try {
    const num = await mongoManager.count("categories");
    if (num === 0) {
      let categories = [
        { Id: "D", name: "24H購物", parent: "" },
        { Id: "Q", name: "PcHome購物", parent: "" }
      ];

      const response = await fetch(
        "http://ecapi.pchome.com.tw/ecshop/cateapi/v1.5/sitemap&fields=Id,Name,Sort,Nodes"
      ).then(resp => resp.json());

      response.map(data => {
        const parent = data.Id.split("/")[0];

        let words = data.Name.split("");
        words = words.map(word => word.trim());
        const newName = words.join("");

        categories.push({
          cateid: data.Id,
          name: newName,
          parent: parent
        });
        if (data.Nodes) {
          data.Nodes.map(item => {
            let words = item.Name.split("");
            words = words.map(word => word.trim());
            const name = words.join("");

            categories.push({
              cateid: item.Id,
              name: name,
              parent: data.Id
            });
          });
        }
      });
      const result = await mongoManager.insert("categories", categories);
    }
  } catch (error) {
    console.log(error);
  }
}

module.exports.checkPchomeCatogery = checkPchomeCatogery;

async function startGetHotProd() {
  let amqpData = amqpManager.getChannelByName("pchome_hot_prods");
  const browser = await puppeteer.launch({ headless: true });

  try {
    if (_.isUndefined(amqpData)) {
      await amqpManager.createChannel({ name: "pchome_hot_prods" });
      amqpData = amqpManager.getChannelByName("pchome_hot_prods");

      const q = await amqpManager.createQueue(amqpData.info.id, {
        name: "pchome_hot_prods",
        options: { durable: true }
      });
      const q_detail = await amqpManager.createQueue(amqpData.info.id, {
        name: "prod_detail",
        options: { durable: true }
      });
      await amqpManager.saveCache();
    }

    const domain = "http://shopping.pchome.com.tw/?m=hotitems&f=display";
    const page = await browser.newPage();
    await page.goto(domain);

    const links = await page.evaluate(() => {
      const links_data = [];
      const tables = document.querySelectorAll(
        "body > div > table:nth-child(4) > tbody > tr > td:nth-child(1) > table"
      );

      for (let index = 0; index < tables.length; index++) {
        const selector = `body > div > table:nth-child(4) > tbody > tr > td:nth-child(1) > table:nth-child(${index +
          1}) > tbody > tr:nth-child(4) > td.text13List> a`;
        const links = document.querySelectorAll(selector);

        for (let links_index = 0; links_index < links.length; links_index++) {
          const link = links[links_index];
          links_data.push(link.href);
        }
      }
      return links_data;
    });

    for (let index = 0; index < links.length; index++) {
      const link = links[index];
      const uri = new URI(link);

      const link_data = {
        url: link,
        domain: `${uri.protocol()}://${uri.domain()}`,
        query: queryString.parse(uri.query())
      };

      amqpData.channel.sendToQueue(
        "pchome_hot_prods",
        new Buffer(JSON.stringify(link_data))
      );
    }
  } catch (error) {
    console.log("error", error);
  }
  browser.close();
}

module.exports.startGetHotProd = startGetHotProd;
