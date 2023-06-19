var authFile = require("../../auth.js");
const Orders = require("../../models/Orders.js");

const getAllOrders = async function (req, res) {
  const api_key_result = req.body.api_key;
  const result = await authFile.apiKeyChecker(api_key_result);
  if (!result)
    res.json({
      status: "fail",
      showableMessage: "Forbidden 403",
      message: "Forbidden 403",
    });

  const orders = await Orders.find({ user_id: req.body.user_id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ status: "success", data: orders });
};

module.exports = getAllOrders;
