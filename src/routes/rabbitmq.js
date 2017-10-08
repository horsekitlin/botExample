"use strict";
const _ = require("lodash");
const express = require("express");
const amqpManager = require("../utils/amqpManager");
const configs = require("../configs");
const { startGetHotProd } = require("../workers");

// const { Authorize } = require("../utils/authManager");
const router = express.Router();

/**
 * @swagger
 * /rabbitmq/create/consumer:
 *   post:
 *     tags:
 *       - Rabbitmq
 *     description: 建立一個新的 consumer
 *     produces:
 *       - application/json
 *     parameters:
 *       - channel: id
 *         description: channel Id
 *         in: body
 *         required: true
 *         type: string
 *       - queue: queue name
 *         description: queue name
 *         in: body
 *         required: true
 *         type: string
 *       - consumer: consumer key
 *         description: consumer key
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       401:
 *         description: request error
 *         schema:
 *           $ref: '#/definitions/Error'
 *       200:
 *         description: success or error message
 *         schema:
 *          properties:
 *            message:
 *              type: string
 */
router.post("/create/consumer", async (req, res) => {
  const { channel, queue, consumer } = req.body;
  if (!channel || !queue || !consumer) {
    res.status(401).json({
      message: "channel or queue or consumer is undefined"
    });
  } else {
    try {
      const consumerData = await amqpManager.createConsumer(
        channel,
        queue,
        consumer,
        { noAck: false }
      );
      await amqpManager.saveCache();
      res.json({
        consumer: consumerData
      });
    } catch (error) {
      res.status(500).json({
        message: error.message
      });
    }
  }
});

/**
 * @swagger
 * /rabbitmq/clear/cache:
 *   post:
 *     tags:
 *       - Rabbitmq
 *     description: 清除所有的 cache 紀錄
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: success message
 *         schema:
 *          properties:
 *            message:
 *              type: string
 */
router.post("/clear/cache", async (req, res) => {
  await amqpManager.clearCache();
  res.json({
    message: "clear cache success"
  });
});

/**
 * @swagger
 * /rabbitmq/create/queue:
 *   post:
 *     tags:
 *       - Rabbitmq
 *     description: 新增一個新的 Queue
 *     produces:
 *       - application/json
 *     parameters:
 *       - channel: id
 *         description: channel Id
 *         in: body
 *         required: true
 *         type: string
 *       - name: queue name
 *         description: queue name
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       401:
 *         description: request error
 *         schema:
 *           $ref: '#/definitions/Error'
 *       200:
 *         description: success message
 *         schema:
 *          properties:
 *            channel:
 *              description: channel name
 *              type: string
 *            name:
 *              type: string
 *              description: queue name
 */
router.post("/create/queue", async (req, res) => {
  const { channel, name } = req.body;
  if (!channel || !name) {
    res.status(401).json({
      message: "channel id 或 name 不可為空"
    });
  } else {
    const queue_data = {
      name,
      options: {
        durable: true
      }
    };
    const queue = await amqpManager.createQueue(channel, queue_data);
    await amqpManager.saveCache();
    res.json({
      queue
    });
  }
});

/**
 * @swagger
 * /rabbitmq/queue/list:
 *   get:
 *     tags:
 *       - Rabbitmq
 *     description: 新增一個新的 Channel
 *     produces:
 *       - application/json
 *     parameters:
 *       - channel: channel unique name
 *         description: channel Id 不可包含特殊字元 _ , * +
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       401:
 *         description: request error
 *         schema:
 *           $ref: '#/definitions/Error'
 *       200:
 *         description: success message
 *         schema:
 *          properties:
 *            channel:
 *              description: channel name
 *              type: string
 *            name:
 *              type: string
 *              description: queue name
 */
router.get("/queue/list", (req, res) => {
  const { channel } = req.query;

  if (!channel) {
    res.status(400).json({
      message: "channel is empty"
    });
  } else {
    const queues = amqpManager.getQueues(channel);
    res.json({
      queues
    });
  }
});

/**
 * @swagger
 * /rabbitmq/create/channel:
 *   post:
 *     tags:
 *       - Rabbitmq
 *     description: 新增一個新的 Channel
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: channel unique name
 *         description: channel Id 不可包含特殊字元 _ , * +
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       401:
 *         description: request error
 *         schema:
 *           $ref: '#/definitions/Error'
 *       200:
 *         description: success message
 *         schema:
 *          properties:
 *            channel:
 *              description: channel name
 *              type: string
 *            name:
 *              type: string
 *              description: queue name
 */
router.post("/create/channel", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({
      message: "channel name is not be empty"
    });
  } else {
    const newChannel = await amqpManager.createChannel({ name });
    await amqpManager.saveCache();

    res.json({ channel: newChannel });
  }
});

/**
 * @swagger
 * /rabbitmq/channel/list:
 *   post:
 *     tags:
 *       - Rabbitmq
 *     description: 新增一個新的 Channel
 *     produces:
 *       - application/json
 *     responses:
 *       401:
 *         description: request error
 *         schema:
 *           $ref: '#/definitions/Error'
 *       200:
 *         description: success message
 *         schema:
 *          properties:
 *            channel:
 *              description: channel name
 *              type: array
 *              schema:
 *                properites:
 *                  name: string
 */

router.get("/channel/list", (req, res) => {
  const channels = amqpManager.getChannels();
  res.json({
    channels
  });
});
/**
 * @swagger
 * /rabbitmq/cnosumer/list:
 *   get:
 *     tags:
 *       - Rabbitmq
 *     description: 取回目前所有可用的 consumer 列表
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: success message
 *         schema:
 *          properties:
 *            consumers:
 *              description: channel name
 *              type: array
 *              schema:
 *                properites:
 *                  name: string
 *                  id: string
 */
router.get("/consumer/list", (req, res) => {
  const consumers = amqpManager.getConsumers();

  res.json({
    consumers: configs.consumers
  });
});

/**
 * @swagger
 * /rabbitmq/initial/hotprod:
 *   post:
 *     tags:
 *       - Rabbitmq
 *     description: initial pchome 熱門補貨的商品task
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: success message
 *         schema:
 *          properties:
 *            consumers:
 *              description: channel name
 *              type: array
 *              schema:
 *                properites:
 *                  name: string
 *                  id: string
 */

router.post("/initial/hotprod", async (req, res) => {
  await startGetHotProd();
  res.json({
    message: "start hot prods"
  });
});

/**
 * @swagger
 * definition:
 *   Error:
 *     properties:
 *       message:
 *         type: string
 */

module.exports = router;
