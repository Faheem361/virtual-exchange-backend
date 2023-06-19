const Wallet = require("../../models/Wallet");
const Pairs = require("../../models/Pairs");
var authFile = require("../../auth.js");
const CoinList = require("../../models/CoinList");
const ApiKeysModel = require("../../models/ApiKeys");
const ApiRequest = require("../../models/ApiRequests");

const getWalletBalance = async function (req, res) {
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
  let coin = await CoinList.findOne({ symbol: req.body.symbol, status: 1 });
  let id = coin._id.toString();
  console.log("id", id);
  var _wallets = await Wallet.findOne({
    user_id: req.body.user_id,
    coin_id: id,
  }).exec();
  console.log("_wallets", _wallets);
  if (!_wallets)
    return res.json({
      status: "Success",
      showableMessage: "Coin not found in wallet",
      message: "coin_not_found",
    });
  let wallets = {
    id: _wallets._id,
    coin_id: _wallets.coin_id,
    balance: _wallets.amount,
    symbolName: coin.symbol + "/USDT",
    symbol: coin.symbol,
    name: coin.name,
    icon: coin.image_url,
  };
  console.log("wallets", wallets);

  res.json({ status: "success", showableMessage: "success", data: wallets });
};

module.exports = getWalletBalance;
