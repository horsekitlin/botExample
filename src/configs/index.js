const development = require("./development");
const production = require("./production");
const unitest = require("./unitest");

module.exports = {
  unitest,
  development,
  production,
  consumers: [
    {
      name: "建立parse pchome detail 的 worker",
      id: "hotProdDetailConsumer"
    },
    {
      name: "取得 pchome 熱門補貨列表 的 worker",
      id: "hotProdConsumer"
    }
  ]
};
