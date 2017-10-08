const _ = require("lodash");
const puppeteer = require("puppeteer");
const striptags = require("striptags");
const moment = require("moment");
const mongoManager = require("../../utils/mongoManager");
const amqpManager = require("../../utils/amqpManager");
const puppeteerManager = require("../../utils/puppeteerManager");
const URI = require("urijs");
const queryString = require("query-string");

const { getHotProdsLinks, createNewProd } = require("./pchome/hotProds");

async function hotProdDetailConsumer(channel, msg) {
  let data, page;
  data = JSON.parse(msg.content.toString());
  if (!_.isUndefined(data.errorCount) && data.errorCount > 2) {
    return channel.ack(msg);
  }
  page = await puppeteerManager.getNewPage(data.url);
  try {
    page.on("dialog", dialog => {
      dialog.accept();
      channel.ack(msg);
    });
    const prod = await page.evaluate(() => {
      const price = document.querySelector("#PriceTotal").innerHTML;

      const titles = document
        .querySelector("#NickContainer")
        .innerHTML.split(/<br \/>|<br\/>|<br>/);

      const title = titles[1];
      const subtitle = titles[0];
      let picture = document.querySelector("#ImgContainer > div > img").src;

      const descript = document.querySelector("#SloganContainer").innerHTML;

      const options = document.querySelectorAll(
        "#ButtonContainer > select.spec  option"
      );

      const select = document.querySelector("#ButtonContainer > select.spec");

      const specs = {};

      for (let index = 0; index < options.length; index++) {
        const option = options[index];
        if (option.value) {
          select.value = option.value;
          const qtyOptions = $(".fieldset_box> .add24hCart > .Qty option");
          specs[option.value] = {
            count: qtyOptions.length,
            name: option.innerHTML,
            id: option.value
          };
        }
      }
      return {
        picture,
        descript,
        title,
        subtitle,
        price,
        specs
      };
    });

    const newProd = _.pick(prod, "picture", "title", "specs");
    newProd.descript = _.compact(
      striptags(prod.descript, [], "\n").split("\n")
    );

    newProd.subtitle = striptags(prod.subtitle);
    newProd.price = {};
    newProd.price[moment().format("YYYY-MM-DD")] = prod.price;
    newProd.id = data.id;
    newProd.category = data.category;

    await mongoManager.insert("prods", newProd);
    channel.ack(msg);
  } catch (error) {
    if (_.isUndefined(data.errorCount)) {
      data.errorCount = 1;
    } else {
      data.errorCount = data.errorCount + 1;
    }
    channel.sendToQueue("prod_detail", JSON.stringify(data));
    channel.ack(msg);
  }
  if (!_.isUndefined(page)) {
    page.close();
  }
}

module.exports.hotProdDetailConsumer = hotProdDetailConsumer;

async function hotProdConsumer(channel, msg) {
  let uriObject, page;

  try {
    uriObject = JSON.parse(msg.content.toString());
    if (!_.isUndefined(uriObject.errorCount) && uriObject.errorCount > 2) {
      channel.ack(msg);
    }

    page = await puppeteerManager.getNewPage(uriObject.url);

    const prodsData = await getHotProdsLinks(page);

    prodsData.detailLinks.map(async link => {
      const uri = new URI(link);
      const query = queryString.parse(uri.query());
      const cateId = uriObject.query.RG_NO;

      const id = uri
        .path()
        .split("/")
        .pop();
      const exists = await mongoManager.checkProdExists(cateId, id);
      if (_.isNull(exists) || exists === false) {
        createNewProd(channel, link, cateId, id, query);
      }
      //若是商品已存在要增加更新目前商品內容的 consumer
    });
    if (prodsData.page === 1 && prodsData.total > 1) {
      for (let index = 2; index <= prodsData.total; index++) {
        const newURLObject = Object.assign({}, uriObject);
        newURLObject.query.page = index;
        newURLObject.url = `${newURLObject.domain}?${queryString.stringify(
          newURLObject.query
        )}`;

        channel.sendToQueue(
          "pchome_hot_prods",
          new Buffer(JSON.stringify(newURLObject))
        );
      }
    }
    await puppeteerManager.closePage(page);
    channel.ack(msg);
  } catch (error) {
    if (_.isUndefined(uriObject.errorCount)) {
      uriObject.errorCount = 1;
    } else {
      uriObject.errorCount = uriObject.errorCount + 1;
    }
    channel.sendToQueue(
      "pchome_hot_prods",
      new Buffer(JSON.stringify(uriObject))
    );
    page.close();
    channel.ack(msg);
  }
}

module.exports.hotProdConsumer = hotProdConsumer;
