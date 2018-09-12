const express = require("express");
const router = express.Router();
router.get("/", (req, res) => {
  res.send({ response: "active connection" }).status(200);
});
router.get("/abc", (req, res) => {
  res.send({ response: "heyoooooo" }).status(200);
});
module.exports = router;