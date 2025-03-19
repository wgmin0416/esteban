const express = require("express");
const router = express.Router();
const joinRoute = require("./join");
const loginRoute = require("./login");

router.post("/join", joinRoute);
router.use("/login", loginRoute);

module.exports = router;
