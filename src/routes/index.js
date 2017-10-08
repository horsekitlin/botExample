const express = require("express");
const router = express.Router();
const { Authorize } = require("../utils/authManager");

/* GET home page. */
router.get("/", Authorize, function(req, res, next) {
  res.json({ title: "Express", user: req.user });
});

module.exports = router;
