var authFile = require("../../auth.js");
const Orders = require("../../models/Orders.js");

const getOrders = async function (req, res) {
  const api_key_result = req.body.api_key;
  const { pair, method, type, fromDate, toDate, status } = req.query;
  console.log(type, "limit");
  const result = await authFile.apiKeyChecker(api_key_result);
  if (!result) res.json({ status: "fail", message: "Forbidden 403" });

  const filter = { user_id: req.body.user_id };
  if (pair) filter.pair_name = pair;
  if (method) filter.method = method;
  if (type) filter.type = type;
  if (fromDate && toDate) filter.createdAt = { $gte: fromDate, $lte: toDate };
  if (status) filter.status = status;
  console.log("filter", filter);
  const orders = await Orders.find(filter).sort({ createdAt: -1 }).lean();
  console.log("orders", orders);
  res.json({ status: "success", data: orders });
};

module.exports = getOrders;
