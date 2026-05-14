"use strict";

var express = require("express");
var router = express.Router();

var apiMiddleware = require("../middlewares/api");
const { authentication } = require("../middlewares/authentication");

const {
  login,
  logout,
} = require("../controllers/AuthController");

router.options("/login", (req, res) => res.sendStatus(200));

router.post(
  "/login",
  apiMiddleware,
  login
);

router.post(
  "/logout",
  apiMiddleware,
  authentication,
  logout
);

module.exports = router;