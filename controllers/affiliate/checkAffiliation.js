const User = require("../../models/User");
const Affiliate = require("../../models/Affiliate");
var authFile = require("../../auth.js");

const checkAffiliate = async function (req, res) {
    var api_key_result = req.body.api_key;
    var user_id = req.body.user_id;
    var result = await authFile.apiKeyChecker(api_key_result);
    if (result === true) {
        var aff_user = await Affiliate.find({ user_id: user_id }).exec();
        if (aff_user) {
            return res.status(200).json({ status: "success", showableMessage: "success", data: aff_user });
        }
        return res.status(200).json({ status: "success", message: "Success", showableMessage: "Please submit a request for Affiliation" });
    }
    else {
        res.json({
            status: 'error',
            message: 'Invalid API Key',
            showableMessage: "Invalid API Key"
        });
    }
};

module.exports = checkAffiliate;
