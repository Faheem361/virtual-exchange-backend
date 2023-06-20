const Orders = require("../../../models/Orders");
const Wallet = require("../../../models/Wallet");

const AddLimitBuyOrder = async (req, res, getPair, api_result, apiRequest) => {
  let percent = parseFloat(req.body.percent);
  let target_price = parseFloat(req.body.target_price);
  let amount = parseFloat(req.body.amount);
  console.log("get pair", getPair);
  var towallet = await Wallet.findOne({
    coin_id: req.body.symbolId,
    user_id: req.body.user_id,
  }).exec();
  console.log("towallet", towallet);
  console.log("percent", percent, target_price, getPair);
  let balance = towallet.amount;

  if (amount <= 0) {
    return res.json({
      status: "fail",
      showableMessage: "Invalid amount",
      message: "Invalid amount",
    });
  }
  let total = amount * target_price;

  if (balance < total) {
    return res.json({
      status: "fail",
      showableMessage: "Low balance",
      message: "Invalid  balance",
    });
  }

  // let search = Orders.aggregate([
  //   // {
  //   //   $match: {
  //   //     target_price: { $lte: req.body.target_price },
  //   //   },
  //   // },
  //   {
  //     $group: {
  //       _id: null,
  //       totalAmount: { $sum: "$amount" }, // Field to sum
  //     },
  //   },
  // ]).exec(function (err, result) {
  //   if (err) {
  //     console.error("Error executing aggregate:", err);
  //     return;
  //   }
  //   console.log("result", result);
  //   const sum = result.length > 0 ? result[0].totalAmount : 0;
  //   console.log("Sum:", sum);
  // });

  // console.log("search", search);

  let totalAmount = 0;
  let filteredRecords = [];
  let checkSellOrder = await Orders.find({
    type: "limit",
    method: "sell",
    pair_name: req.body.pair_name,
    // first_pair: !req.body.symbolId,
    target_price: { $lte: target_price },
  }).sort({ target_price: 1, createdAt: -1 });

  // console.log("checkSellOrder", checkSellOrder);
  if (!checkSellOrder)
    return res.json({
      status: "Success",
      showableMessage: "Selling order not found",
      message: "sell_order_empty",
    });
  checkSellOrder.forEach((record) => {
    if (totalAmount >= amount) {
      return;
    }
    totalAmount += record.amount;
    filteredRecords.push(record);
  });

  console.log("filteredRecords", filteredRecords);

  // console.log("rec", totalAmount);
  let amountToremove = amount;
  for (record of filteredRecords) {
    await (async () => {
      if (parseFloat(amountToremove) > parseFloat(record.amount)) {
        // console.log(amountToremove, "amountToremove in if");
        amountToremove = amountToremove - record.amount;

        /// minus the amount from wallet
        var fromWallet = await Wallet.findOne({
          coin_id: record.first_pair,
          user_id: record.user_id,
        }).exec();
        // console.log(
        //   fromWallet.amount,
        //   fromWallet.amount - record.amount,
        //   "fromWallet"
        // );
        fromWallet.amount =
          parseFloat(fromWallet.amount) - parseFloat(record.amount);
        await fromWallet.save();

        /// add the amount to wallet

        var towallet = await Wallet.findOne({
          coin_id: record.first_pair,
          user_id: req.body.user_id,
        }).exec();
        // console.log(
        //   towallet.amount,
        //   towallet.amount + record.amount,
        //   "towllet"
        // );
        towallet.amount =
          parseFloat(towallet.amount) + parseFloat(record.amount);
        await towallet.save();

        ////now transfer the buy coins from seller account to buyer
        // console.log("getPair", getPair);
        var fromWalletCoin = await Wallet.findOne({
          coin_id: req.body.symbolId,
          user_id: req.body.user_id,
        }).exec();
        // console.log(fromWalletCoin, "fromWalletCoin");
        let totalCoinRemove =
          parseFloat(record.amount) * parseFloat(record.target_price);
        fromWalletCoin.amount =
          parseFloat(fromWalletCoin.amount) - parseFloat(totalCoinRemove);
        await fromWalletCoin.save();

        var toWalletCoin = await Wallet.findOne({
          coin_id: req.body.symbolId,
          user_id: record.user_id,
        }).exec();
        // console.log(toWalletCoin, "toWalletCoin");
        toWalletCoin.amount =
          parseFloat(toWalletCoin.amount) + parseFloat(totalCoinRemove);
        await toWalletCoin.save();
      } else {
        console.log("in else", amountToremove);
        record.amount = parseFloat(record.amount) - parseFloat(amountToremove);
        var fromWallet = await Wallet.findOne({
          coin_id: record.first_pair,
          user_id: record.user_id,
        }).exec();
        // console.log(
        //   fromWallet.amount,
        //   fromWallet.amount - amountToremove,
        //   "fromWallet in else"
        // );
        fromWallet.amount =
          parseFloat(fromWallet.amount) - parseFloat(amountToremove);
        await fromWallet.save();

        var towallet = await Wallet.findOne({
          coin_id: record.first_pair,
          user_id: req.body.user_id,
        }).exec();
        // console.log(
        //   towallet.amount,
        //   towallet.amount + amountToremove,
        //   "towllet in else"
        // );
        towallet.amount =
          parseFloat(towallet.amount) + parseFloat(amountToremove);
        await towallet.save();

        ////now transfer the buy coins from seller account to buyer
        console.log("getPair", getPair);
        var fromWalletCoin = await Wallet.findOne({
          coin_id: req.body.symbolId,
          user_id: req.body.user_id,
        }).exec();
        // console.log(fromWalletCoin, "fromWalletCoin");
        let totalCoinRemove =
          parseFloat(amountToremove) * parseFloat(record.target_price);
        fromWalletCoin.amount = fromWalletCoin.amount - totalCoinRemove;
        await fromWalletCoin.save();

        var toWalletCoin = await Wallet.findOne({
          coin_id: req.body.symbolId,
          user_id: record.user_id,
        }).exec();
        // console.log(toWalletCoin, "toWalletCoin");
        toWalletCoin.amount =
          parseFloat(toWalletCoin.amount) + parseFloat(totalCoinRemove);
        await toWalletCoin.save();
        amountToremove = 0;
      }
    })();
  }

  const orders = new Orders({
    first_pair: req.body.symbolId,
    pair_name: getPair.name,
    user_id: req.body.user_id,
    amount: toPlainString(amountToremove),
    tokenAmount: toPlainString(amount),
    open_price: 0,
    type: "limit",
    method: "buy",
    target_price: target_price,
    status: 1,
  });
  let saved = await orders.save();
  // let saved = false;
  if (saved) {
    if (api_result === false) {
      apiRequest.status = 1;
      await apiRequest.save();
    }
    return res.json({
      status: "success",
      showableMessage: "Buy Limit Order Successfully Created",
      data: saved,
    });
  } else {
    return res.json({
      status: "fail",
      showableMessage: "Unknown Error",
      message: "Unknow error",
    });
  }
};

module.exports = AddLimitBuyOrder;

function toPlainString(num) {
  return ("" + +num).replace(
    /(-?)(\d*)\.?(\d*)e([+-]\d+)/,
    function (a, b, c, d, e) {
      return e < 0
        ? b + "0." + Array(1 - e - c.length).join(0) + c + d
        : b + c + d + Array(e - d.length + 1).join(0);
    }
  );
}
