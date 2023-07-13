const Wallet = require("../../models/Wallet");
var authFile = require("../../auth.js");
const CoinList = require("../../models/CoinList");
const ApiKeysModel = require("../../models/ApiKeys");
const ApiRequest = require("../../models/ApiRequests");
const Network = require("../../models/Network");
const WalletAddress = require("../../models/WalletAddress");

const getCoinWallet = async function (req, res) {
  var api_key_result = req.body.api_key;

  let api_result = await authFile.apiKeyChecker(api_key_result);
  let apiRequest = "";
  console.log("api_result", api_result);
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
      res.json({
        status: "fail",
        showableMessage: "Forbidden 403",
        message: "Forbidden 403",
      });
      return;
    }
  }

  let networkCheck = await Network.findOne({ _id: req.body.network_id }).exec();
  console.log("networkCheck", networkCheck);
  if (!networkCheck)
    return res.json({
      success: "success",
      showableMessage: "network not found",
      message: "network_not_found",
    });
  let walletOfNetwork = await WalletAddress.findOne({
    network_id: req.body.network_id,
    user_id: req.body.user_id,
  });
  if (!walletOfNetwork)
    return res.json({
      success: "success",
      showableMessage: "Wallet not found",
      message: "wallet_not_found",
    });
  let coinInfo = await CoinList.findOne({ _id: req.body.coin_id }).exec();
  console.log("coinInfo", coinInfo);
  if (coinInfo == null || coinInfo.length == 0) {
    return res.json({
      status: "success",
      showableMessage: "coin not found",
      message: "coin_not_found",
    });
  }
  var _wallets = await Wallet.find(
    {
      user_id: req.body.user_id,
      coin_id: coinInfo._id,
    },
    { private_key: 0, _id: 0 }
  ).exec();
  console.log("_wallets", _wallets);
  if (_wallets.length == 0)
    return res.json({
      status: "success",
      showableMessage: "Wallet not found",
      message: "wallet_not_found",
    });
  //   var wallets = {};

  res.json({
    status: "success",
    showableMessage: "Wallet found",
    data: _wallets,
  });
};

module.exports = getCoinWallet;
