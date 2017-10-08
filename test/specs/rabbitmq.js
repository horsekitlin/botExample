const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../../build/app");
const amqpManager = require("../../build/utils/amqpManager");
const mongoManager = require("../../build/utils/mongoManager");

const { describe, it } = global;

chai.should();

chai.use(chaiHttp);

const request = chai.request(app);

let channel, queue;

describe("rabbitmq unutest", () => {
  before(done => {
    mongoManager
      .connect()
      .then(() => amqpManager.initial())
      .then(() => amqpManager.clearCache())
      .then(() => done())
      .catch(error => done(error));
  });

  it("should create channel", done => {
    request
      .post("/rabbitmq/create/channel")
      .send({
        name: "test_channel"
      })
      .end((error, resp) => {
        if (error) {
          done(error);
        } else {
          resp.should.have.property("status", 200);
          resp.should.have.property("body");
          resp.body.should.have.property("channel");
          channel = resp.body.channel;
          resp.body.channel.should.have.property("id");
          resp.body.channel.should.have.property("name");
          done();
        }
      });
  });

  it("should get channel list", done => {
    request
      .get("/rabbitmq/channel/list")
      .send({})
      .end((error, response) => {
        if (error) {
          done(error);
        } else {
          response.should.have.property("status", 200);
          response.body.should.have.property("channels");
          response.body.channels.map(channel => {
            channel.should.have.property("id");
            channel.should.have.property("name");
          });
          done();
        }
      });
  });

  it("should create a queue", done => {
    request
      .post("/rabbitmq/create/queue")
      .send({
        channel: channel.id,
        name: "test_queue"
      })
      .end((error, response) => {
        if (error) {
          done(error);
        } else {
          response.should.have.property("status", 200);
          response.should.have.property("body");
          response.body.should.have.property("queue");
          response.body.queue.should.have.property("queue");
          response.body.queue.should.have.property("messageCount");
          response.body.queue.should.have.property("consumerCount");

          queue = response.body.queue;
          done();
        }
      });
  });

  it("should create a queue but get empty channel name error", done => {
    request
      .post("/rabbitmq/create/queue")
      .send({
        channel: "",
        name: "test_queue"
      })
      .end((error, response) => {
        response.should.have.property("status", 401);
        response.should.have.property("body");
        response.body.should.have.property("message");
        done();
      });
  });

  it("should create a queue bug get empty queue error", done => {
    request
      .post("/rabbitmq/create/queue")
      .send({
        channel: channel.name,
        name: ""
      })
      .end((error, response) => {
        response.should.have.property("status", 401);
        response.should.have.property("body");
        response.body.should.have.property("message");
        done();
      });
  });

  it("should create a consumer", done => {
    request
      .post("/rabbitmq/create/consumer")
      .send({
        channel: channel.name,
        queue: queue.queue,
        consumer: "hotProdConsumer"
      })
      .end((error, response) => {
        if (error) {
          done(error);
        } else {
          response.should.have.property("status", 200);
          response.should.have.property("body");

          response.body.should.have.property("consumer");
          response.body.consumer.should.have.property("info");
          response.body.consumer.info.should.have.property(
            "channel",
            channel.name
          );
          response.body.consumer.info.should.have.property(
            "queue",
            queue.queue
          );
          response.body.consumer.info.should.have.property("options");
          response.body.consumer.info.should.have.property("consumerTag");
          done();
        }
      });
  });

  it("should get consuemr list", done => {
    request.get("/rabbitmq/consumer/list").end((error, resp) => {
      if (error) {
        done(error);
      } else {
        resp.should.have.property("status", 200);
        resp.should.have.property("body");
        resp.body.should.have.property("consumers");
        resp.body.consumers.map(consumer => {
          consumer.should.have.property("name");
          consumer.should.have.property("id");
        });
        done();
      }
    });
  });
});
