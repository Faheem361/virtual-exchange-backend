const CoinList = require("../../models/CoinList");

const getCoinList = async (req, res) => {
  let coins = await CoinList.find({ status: 1 }).exec();
  res.json({ status: "success", showableMessage: "success", data: coins });
};

module.exports = getCoinList;
