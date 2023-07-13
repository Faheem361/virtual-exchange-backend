const Wallet = require("../../models/Wallet");
var authFile = require("../../auth.js");

const getNativeBalance = async function (req, res) {
  var api_key_result = req.body.api_key;
  let result = await authFile.apiKeyChecker(api_key_result);

  if (result === true) {
    var list = await Wallet.findOne({
      user_id: req.body.user_id,
      coinName: req.body.symbol,
    }).exec();
    console.log("list", list);
    if (list == null) {
      res.json({
        status: "fail",
        showableMessage: "Wallet not found",
        message: "Wallet_not_found",
      });
      return;
    }

    res.json({
      status: "success",
      showableMessage: "success",
      data: list.amount,
    });
  } else {
    res.json({
      status: "fail",
      showableMessage: "Forbidden 403",
      message: "Forbidden 403",
    });
  }
};

module.exports = getNativeBalance;
