const amqp = require("amqplib");
const uuid = require("uuid/v4");
const mongoManager = require("./mongoManager");
const _ = require("lodash");
const consumers = require("../workers/consumers");
const configs = require("../configs");
const key = process.env.NODE_ENV || "production";
const config = configs[key];
let uri = "amqp://";
if (config.rabbitmq.user) {
  uri = `${uri}${config.rabbitmq.user.account}:${config.rabbitmq.user
    .password}@`;
}

uri = `${uri}${config.rabbitmq.host}`;

class amqpManagerClass {
  constructor() {
    this.cache = false;
    this._channels = {};
  }

  createConsumer = async (channelName, queueName, consumerKey, options) => {
    let amqpData = this.getChannelByName(channelName);
    if (_.isUndefined(amqpData)) {
      throw new Error("Channel is not found");
    }
    const result = await amqpData.channel.consume(
      queueName,
      msg => consumers[consumerKey](amqpData.channel, msg),
      options
    );

    result.consumerTag = this.getConsumerTag(result.consumerTag);

    const consumerInfo = {
      info: {
        channel: channelName,
        queue: queueName,
        consumer: consumerKey,
        options,
        ...result
      }
    };
    amqpData.consumers[result.consumerTag] = consumerInfo;
    return consumerInfo;
  };

  clearCache = () => {
    return mongoManager.remove("amqpcache", {});
  };

  getConsumers = () => {
    const { consumers } = this._channels;
    const result = [];
    for (const key in consumers) {
      result.push(consumers[key].info);
    }
    return result;
  };

  getQueues = channel => {
    const amqpData = this.getChannelByName(channel);
    const queues = [];
    for (const key in amqpData.queues) {
      const queue = amqpData.queues[key];
      queues.push(queue.info);
    }
    return queues;
  };

  getChannelByName = name => {
    const channel = _.find(this._channels, c => {
      return c.info.name === name;
    });
    return channel;
  };

  getChannels = () => {
    return _.map(this._channels, (channel, key) => {
      return channel.info;
    });
  };

  createQueue = async (name, queue) => {
    const keys = Object.keys(this._channels);
    const data = this._channels[name];
    if (data) {
      const options = queue.option || { durable: true };
      const queue_ref = await data.channel.assertQueue(queue.name, options);
      const queue_data = {
        ref: queue_ref,
        info: queue
      };

      this._channels[name].queues[queue.name] = queue_data;
      return queue_ref;
    }
  };

  initial = async () => {
    try {
      const conn = await amqp.connect(uri);
      this.connection = conn;
      await this.loadCache();
    } catch (error) {
      throw error;
    }
  };

  loadCache = async () => {
    const cache = await mongoManager.findOne("amqpcache");

    if (!_.isNull(cache)) {
      for (const index in cache.channels) {
        const channel = cache.channels[index];
        await this.createChannel(channel.info);

        for (const consumerKey in channel.consumers) {
          const consumer = channel.consumers[consumerKey];
          const { info } = consumer;
          await this.createConsumer(
            info.channel,
            info.queue,
            info.consumer,
            info.options
          );
        }
        for (const key in channel.queues) {
          const queue = channel.queues[key];
          const queue_data = {
            name: queue.name,
            options: queue.options
          };
          await this.createQueue(channel.info.id, queue_data);
        }
      }
    }
  };

  getConsumerTag(key) {
    return key.split(".")[1];
  }

  hashConsumerTag(key) {
    return `amq.${key}`;
  }

  saveCache = async () => {
    const channels = _.map(this._channels, channel => {
      const info = {
        info: channel.info,
        queues: {},
        consumers: {}
      };
      for (const consumerKey in channel.consumers) {
        info.consumers[consumerKey] = channel.consumers[consumerKey];
      }

      for (const key in channel.queues) {
        info.queues[key] = channel.queues[key].info;
      }
      return info;
    });

    const cache = await mongoManager.findOne("amqpcache");

    if (_.isNull(cache)) {
      mongoManager.insert("amqpcache", {
        channels
      });
    } else {
      mongoManager.update(
        "amqpcache",
        { _id: cache._id },
        { $set: { channels } }
      );
    }
  };

  createChannel = async (options = {}) => {
    let { name = "", id } = options;
    if (!id) {
      id = uuid();
    }
    if (!this.connection) {
      await this.initial();
    }
    const channel = await this.connection.createChannel();
    channel.prefetch(5);

    const newChannel = {
      id,
      name: name
    };
    this._channels[id] = {
      channel,
      queues: {},
      consumers: {},
      info: newChannel
    };
    return newChannel;
  };
}

const amqpManager = new amqpManagerClass();

module.exports = amqpManager;
