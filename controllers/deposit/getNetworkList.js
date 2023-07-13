const CoinList = require("../../models/CoinList");
const Wallet = require("../../models/Wallet");
const WalletAddress = require("../../models/WalletAddress");
const CoinNetworkOption = require("../../models/CoinNetworkOption");
const Network = require("../../models/Network");

const getNetworkList = (req, res) => {
  Network.find({ status: 1 }).then((network) => {
    res.json({ status: "success", showableMessage: "success", data: network });
  });
};

module.exports = getNetworkList;
