const express = require("express");
const path = require("path");
const logger = require("morgan");
const bodyParser = require("body-parser");
const swaggerJSDoc = require("swagger-jsdoc");

const index = require("./routes/index");
const rabbitmq = require("./routes/rabbitmq");

const app = express();

// swagger definition
var swaggerDefinition = {
  info: {
    title: "Notification bots api",
    version: "1.0.0",
    description: "Demonstrating how to describe a RESTful API with Swagger"
  },
  host: "localhost:3000",
  basePath: "/"
};

// options for the swagger docs
var options = {
  // import swaggerDefinitions
  swaggerDefinition: swaggerDefinition,
  // path to the API docs
  apis: ["./src/routes/*.js"]
};

// initialize swagger-jsdoc
var swaggerSpec = swaggerJSDoc(options);

app.get("/swagger.json", function(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", index);
app.use("/rabbitmq", rabbitmq);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // render the error page
  res.status(err.status || 500).json({ message: err.message });
});

process.setMaxListeners(0);

process.on("uncaughtException", error => {
  console.log(error);
});

module.exports = app;
