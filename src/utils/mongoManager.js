const _ = require("lodash");
const mongo = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const cacheManager = require("cache-manager");
const mongoStore = require("cache-manager-mongodb");
const configs = require("../configs");

const env = process.env.NODE_ENV || "production";

const config = configs[env];

class MongoManagerClass {
  constructor(options) {
    this.options = options;
    this.uniqueOptions = Object.assign({}, options, {
      dbName: "notification-cache"
    });
    this.uri = this.getMongoURI(this.options);
    this.uniqueUri = this.getMongoURI(this.uniqueOptions);
  }

  getMongoURI = options => {
    let uri = "mongodb://";
    if (options.user) {
      uri = `${uri}${options.user.account}:${options.user.password}@`;
    }
    uri = `${uri}${options.host}:${options.port}`;
    if (options.dbName) {
      uri = `${uri}/${options.dbName}`;
    }
    return `${uri}?authSource=admin`;
  };

  connect = async url => {
    url = url || this.uri;
    const db = await mongo.connect(url);
    db.on("close", () => {
      db.close();
    });
    this.db = db;
    return db;
  };

  checkProdExists = async (cateId, prodId) => {
    const subCateId = prodId.split("-")[0];
    const query = {
      cateId,
      subCateId
    };

    const data = await this.findOne("checkunique", query);

    if (!data) {
      const insertQuery = {
        cateId,
        subCateId
      };
      await this.initProdExists(cateId, prodId);
      return null;
    } else if (!data.prods[prodId]) {
      await this.setProdExists(cateId, prodId);
      return false;
    } else {
      return true;
    }
  };

  setProdExists = async (cateId, prodId) => {
    const updateQuery = {};
    updateQuery[`prod.${prodId}`] = {
      daily: true
    };
    return this.update("checkunique", { cateId }, { $set: updateQuery });
  };

  initProdExists = async (cateId, prodId) => {
    const subCateId = prodId.split("-")[0];
    const prods = {};
    prods[prodId] = {
      daily: true
    };

    this.insert("checkunique", { cateId, subCateId, prods: prods });
  };

  count(collection, query = {}) {
    return this.db
      .collection(collection)
      .find(query)
      .count();
  }

  insert(collection, query, options = {}) {
    return this.db.collection(collection).insert(query, options);
  }

  find(collection, query, options = {}) {
    return this.db
      .collection(collection)
      .find(query, options)
      .toArray();
  }

  getObjectId(str) {
    return ObjectID(str);
  }

  findOne = (collection, query, options = {}) => {
    return this.db.collection(collection).findOne(query, options);
  };

  update(collection, query, updateData) {
    const params = {
      dbName: config.dbName,
      collection,
      query,
      updateData
    };
    return this.db.collection(collection).update(query, updateData);
  }

  remove = (collection, query = {}) => {
    return this.db.collection(collection).remove(query);
  };
}

const mongoManager = new MongoManagerClass(config.mongo);

module.exports = mongoManager;
