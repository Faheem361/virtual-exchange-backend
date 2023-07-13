const mongoose = require("mongoose");
var uniqueValidator = require("mongoose-unique-validator");

const CoinListSchema = new mongoose.Schema({
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  network: { type: String, required: true },
  contract_address: { type: String, required: false, default: null },
  image_url: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image",
    required: false,
    default: null,
  },
  status: { type: String, required: false, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

CoinListSchema.plugin(uniqueValidator);

module.exports = mongoose.model("CoinList", CoinListSchema);
