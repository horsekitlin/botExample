/**熱門補貨相關產品 */

function getHotProdsLinks(page) {
  return page.evaluate(() => {
    let pageNum = 1,
      total = 1;
    const text = document.querySelector(".text12_search").innerHTML;
    if (text) {
      total = parseInt(
        text
          .split("/")[1]
          .split("頁")[0]
          .trim(),
        10
      );
      pageNum = parseInt(
        text
          .split("/")[0]
          .split("第")[1]
          .trim(),
        10
      );
    }
    const rows = document.querySelectorAll(
      "body > div > table:nth-child(4) > tbody > tr > td:nth-child(3) > table:nth-child(2) > tbody > tr > td > table"
    );

    const detailLinks = [];
    for (let index = 0; index < rows.length; index++) {
      const columns = [];
      const columnsData = document.querySelectorAll(
        `body > div > table:nth-child(4) > tbody > tr > td:nth-child(3) > table:nth-child(2) > tbody > tr > td > table:nth-child(${index +
          1}) > tbody > tr > td`
      );
      for (
        let columnsIndex = 0;
        columnsIndex < columnsData.length;
        columnsIndex++
      ) {
        const link = document.querySelector(
          `body > div > table:nth-child(4) > tbody > tr > td:nth-child(3) > table:nth-child(2) > tbody > tr > td > table:nth-child(${index +
            1}) > tbody > tr > td:nth-child(${columnsIndex +
            1}) > table > tbody > tr:nth-child(3) > td > div > a`
        );
        if (link) {
          detailLinks.push(link.href);
        }
      }
    }
    return {
      page: pageNum,
      total,
      detailLinks
    };
  });
}

module.exports.getHotProdsLinks = getHotProdsLinks;

function createNewProd(channel, link, cateId, id, query) {
  const prod = {
    url: link,
    tags: ["hot"],
    category: cateId,
    id,
    query
  };
  channel.sendToQueue("prod_detail", new Buffer(JSON.stringify(prod)));
}

module.exports.createNewProd = createNewProd;
