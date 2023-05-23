const mongoose = require("mongoose");

const AffiliateSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    affiliate: { type: String, required: true },
    status: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Affiliate", AffiliateSchema);
