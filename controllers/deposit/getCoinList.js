const CoinList = require("../../models/CoinList");

const getCoinList = (req, res) => {
  CoinList.find({ status: 1 }).then((coins) => {
    res.json({ status: "success", data: coins });
  });
};

module.exports = getCoinList;
