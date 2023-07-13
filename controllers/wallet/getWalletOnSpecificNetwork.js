const Wallet = require("../../models/Wallet");
var authFile = require("../../auth.js");
const CoinList = require("../../models/CoinList");
const ApiKeysModel = require("../../models/ApiKeys");
const ApiRequest = require("../../models/ApiRequests");
const WalletAddress = require("../../models/WalletAddress");

const getNetworkWallet = async function (req, res) {
  var api_key_result = req.body.api_key;
  let api_result = await authFile.apiKeyChecker(api_key_result);
  let apiRequest = "";

  if (api_result === false) {
    let checkApiKeys = "";

    checkApiKeys = await ApiKeysModel.findOne({
      api_key: api_key_result,
      get_balance: "1",
    }).exec();

    if (checkApiKeys != null) {
      apiRequest = new ApiRequest({
        api_key: api_key_result,
        request: "getBalance",
        ip: req.body.ip ?? req.connection.remoteAddress,
        user_id: checkApiKeys.user_id,
      });
      await apiRequest.save();
    } else {
      res.json({ status: "fail", message: "Forbidden 403" });
      return;
    }
  }
  console.log("req.body.user_id", req.body.user_id, req.body.network_id);
  var _wallets = await WalletAddress.find(
    {
      user_id: req.body.user_id,
      network_id: req.body.network_id,
    },
    { _id: 0, private_key: 0 }
  ).exec();
  console.log("_wallets in specific", _wallets);

  res.json({ status: "success", showableMessage: "success", data: _wallets });
};

module.exports = getNetworkWallet;
