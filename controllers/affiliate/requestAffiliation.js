const User = require("../../models/User");
const Affiliate = require("../../models/Affiliate");
var authFile = require("../../auth.js");


const requestAffiliation = async function (req, res) {
    var api_key_result = req.body.api_key;
    var user_id = req.body.user_id;
    var result = await authFile.apiKeyChecker(api_key_result);
    const affiliate = Math.random().toString(36).slice(-6);

    if (result === true) {
        var aff_user = await Affiliate.findOne({ user_id: user_id }).exec();
        if (aff_user) {
            return res.json({ status: "success", message: "Affiliation request already added", showableMessage: "Affiliation request already added" });
        }
        let newData = new Affiliate({
            user_id: user_id,
            affiliate: affiliate,
            status: 0,
        });

        await newData.save();
        return res.status(200).json({ status: "success", message: "success", showableMessage: "Request added" });
    }
    else {
        return res.json({
            status: 'error',
            message: 'Invalid API Key',
            showableMessage: "Invalid API Key"
        });
    }
};

module.exports = requestAffiliation;
