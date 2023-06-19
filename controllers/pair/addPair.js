const Pairs = require("../../models/Pairs");
var authFile = require("../../auth.js");
const axios = require("axios");

const addPair = async function (req, res) {
  var api_key_result = req.body.api_key;
  var result = await authFile.apiKeyChecker(api_key_result);
  // let coinSymbol = req.body.coin;
  if (result === true) {
    //   const response = await axios.get(
    //     `https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD,JPY,EUR`
    //   );
    //   console.log(response, "data");
    //   const price = response.data;
    //   console.log(`Price of ${coinSymbol}: $${price}`);
    //   res.json({ status: "fail", message: "Forbidden 403", data: price });
    const checkPair = await Pairs.findOne({
      name: req.body.name,
      symbolOneID: req.body.symbolOneID,
      symbolTwoID: req.body.symbolTwoID,
    });
    console.log("checkPair", checkPair);
    if (checkPair) {
      return res.json({
        status: "Error",
        showableMessage: "Pair already Exist",
      });
    }
    const newPair = new Pairs({
      name: req.body.name,
      symbolOne: req.body.symbolOne,
      symbolTwo: req.body.symbolTwo,
      digits: req.body.digits,
      type: req.body.type,
      symbolOneID: req.body.symbolOneID,
      symbolTwoID: req.body.symbolTwoID,
    });

    newPair.save();
    res.json({ status: "success", data: newPair });
  } else {
    res.json({ status: "fail", message: "Forbidden 403" });
  }
};

module.exports = addPair;
