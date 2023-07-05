const Orders = require("../../../models/Orders");
const Wallet = require("../../../models/Wallet");

const AddLimitSellOrder = async (req, res, getPair, api_result, apiRequest) => {
  let percent = parseFloat(req.body.percent);
  let target_price = parseFloat(req.body.target_price);
  let amount = parseFloat(req.body.amount);

  var fromWallet = await Wallet.findOne({
    coin_id: req.body.symbolId,
    user_id: req.body.user_id,
  }).exec();
  let balance = parseFloat(fromWallet.amount);
  let total = amount * target_price;
  // amount = splitLengthNumber(amount);
  if (amount <= 0) {
    return res.json({
      status: "fail",
      showableMessage: "Invalid amount",
      message: "Invalid amount",
    });
  }
  if (balance < amount) {
    return res.json({
      status: "fail",
      showableMessage: "Low balance",
      message: "Invalid  balance",
    });
  }
  console.log("percent", percent, target_price, getPair.symbolTwoID);
  let totalAmount = 0;
  let filteredRecords = [];

  let checkBuyOrder = await Orders.find({
    type: "limit",
    method: "buy",
    pair_name: req.body.pair_name,
    // first_pair: !req.body.symbolId,
    target_price: { $gte: target_price },
  }).sort({ target_price: 1, createdAt: -1 });
  console.log("checkBuyOrder", checkBuyOrder);
  if (!checkBuyOrder)
    return res.json({
      status: "Success",
      showableMessage: "Buying order not found",
      message: "buy_order_empty",
    });
  checkBuyOrder.forEach((record) => {
    if (totalAmount >= amount) {
      return;
    }
    totalAmount += record.amount;
    filteredRecords.push(record);
  });

  console.log("filteredRecords", filteredRecords);

  const orders = new Orders({
    first_pair: req.body.symbolId,
    pair_name: getPair.name,
    user_id: req.body.user_id,
    amount: toPlainString(amount),
    tokenAmount: toPlainString(amount),
    open_price: 0,
    type: "limit",
    method: "sell",
    target_price: target_price,
    status: 1,
  });
  let saved = await orders.save();
  if (saved) {
    fromWallet.amount = fromWallet.amount - total;
    await fromWallet.save();
    if (api_result === false) {
      apiRequest.status = 1;
      await apiRequest.save();
    }
    return res.json({
      status: "success",
      showableMessage: "Sell Limit Order Successfully Created",
      data: saved,
    });
  } else {
    return res.json({
      status: "fail",
      showableMessage: "Unknown error",
      message: "Unknow error",
    });
  }
};
function splitLengthNumber(q) {
  return q.toString().length > 10
    ? parseFloat(q.toString().substring(0, 10))
    : q;
}
module.exports = AddLimitSellOrder;

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
