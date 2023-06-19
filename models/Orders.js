const mongoose = require("mongoose");
var uniqueValidator = require("mongoose-unique-validator");

const OrdersSchema = new mongoose.Schema({
  first_pair: { type: String, required: true },
  pair_name: { type: String, required: true },
  type: { type: String, required: true },
  user_id: { type: String, required: true },
  target_price: { type: Number, required: false },
  method: { type: String, required: true },
  amount: { type: Number, required: true },
  tokenAmount: { type: Number, default: 0.0 },
  stop_limit: { type: Number, required: false, default: 0.0 },
  open_price: { type: Number, required: true },
  feeUSDT: { type: Number, default: 0.0 },
  feeAmount: { type: Number, default: 0.0 },
  limit_order_id: { type: String, default: "" },
  status: { type: Number, required: false, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

OrdersSchema.index({ user_id: 1 });
module.exports = mongoose.model("Orders", OrdersSchema);
