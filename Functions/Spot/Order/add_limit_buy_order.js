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

  let totalAmount = 0;
  let filteredRecords = [];
  let checkSellOrder = await Orders.find({
    type: "limit",
    method: "sell",
    target_price: { $lte: target_price },
    // $expr: { $gt: [{ $sum: "$tokenAmount" }, amount] },
  }).sort({ target_price: 1, createdAt: -1 });

  console.log("checkSellOrder", checkSellOrder);
  checkSellOrder.forEach((record) => {
    if (totalAmount >= amount) {
      return;
    }
    totalAmount += record.amount;
    filteredRecords.push(record);
  });

  console.log("filteredRecords", filteredRecords);

  console.log("rec", totalAmount);
  let amountToremove = amount;
  filteredRecords.forEach(async (record) => {
    // console.log("record", record);
    if (parseFloat(amountToremove) > parseFloat(record.amount)) {
      amountToremove = amountToremove - record.amount;
      // console.log("fromwallet", fromwallet);
      // console.log(incBalance, "incBalance");
      console.log(amountToremove, "amountToremove in if");
      console.log("if", parseFloat(amountToremove) > parseFloat(record.amount));
      console.log(amountToremove, record.amount);
      var towallet = await Wallet.findOne({
        coin_id: record.first_pair,
        user_id: record.user_id,
      }).exec();
      // console.log("towallet", towallet);
      let remBalance = towallet.amount - record.amount;

      // console.log(remBalance, "remBalance");
      var fromwallet = await Wallet.findOne({
        coin_id: record.first_pair,
        user_id: req.body.user_id,
      }).exec();
      let incBalance = fromwallet.amount + record.amount;
    } else {
      console.log("in else", amountToremove);
      var towallet = await Wallet.findOne({
        coin_id: record.first_pair,
        user_id: record.user_id,
      }).exec();
      let remBalance = towallet.amount - amountToremove;
      console.log("remBalance in else", remBalance);
      var fromwallet = await Wallet.findOne({
        coin_id: record.first_pair,
        user_id: req.body.user_id,
      }).exec();
      let incBalance = fromwallet.amount + amountToremove;
      console.log("incBalance in else", incBalance);

      if (record.amount > amountToremove) {
        let val = record.amount - amountToremove;
        console.log("val to remove differnce", val);
        // record.amount = record.amount - amountToremove;
        // await record.save();
        amountToremove = amountToremove - amountToremove;
      }

      console.log(amountToremove, "amountToremove in else");
    }
  });

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
  // let saved = await orders.save();
  let saved = true;

  if (saved) {
    // towallet.amount = towallet.amount - total;
    // await towallet.save();

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
