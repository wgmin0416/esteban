const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.send("auth 라우트");
});

module.exports = router;