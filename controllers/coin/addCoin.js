const CoinList = require("../../models/CoinList");
var authFile = require("../../auth.js");
const { uploadImage } = require("../imageUpload");
const fs = require("fs");
const path = require("path");
const Image = require("../../models/image");

const addCoin = async (req, res) => {
  var api_key_result = req.body.api_key;

  const checkCoin = await CoinList.findOne({
    name: req.body.name,
    symbol: req.body.symbol,
    network: req.body.network,
  }).exec();

  if (checkCoin != null) {
    return res.json({
      status: "success",
      showablemessage: "Coin already added",
      data: "Coin already added",
    });
  }
  console.log("req", req.file);
  // let image_url = uploadImage(req, res);
  const img = fs.readFileSync(req.file.path);
  // const img = req.file.buffer;
  // console.log("req", img);

  const encodeImage = img.toString("base64");

  const image = new Image({
    name: req.body.name,
    path: req.file.path,
    img: {
      data: Buffer.from(encodeImage, "base64"),
      contentType: req.file.mimetype,
    },
  });

  image.save(async (err, response) => {
    if (err) {
      console.log(err);
      return res.json({
        status: "fail",
        showablemessage: "An error Occured",
        message: "An error occurred",
      });
    } else {
      console.log("response", response);
      // const newCoin = new CoinList({
      //   name: req.body.name,
      //   symbol: req.body.symbol,
      //   network: req.body.network,
      //   contract_address: req.body.contract_address,
      //   image_url: response._id,
      // });
      let result = await authFile.apiKeyChecker(api_key_result);

      if (result === true) {
        // newCoin.save();
        return res.json({
          status: "success",
          showablemessage: "success",
          data: result,
        });
      } else {
        return res.json({
          status: "fail",
          showablemessage: "Forbidden 403",
          message: "Forbidden 403",
        });
      }
    }
  });
  // let image_url = uploadImage(
  //   req.file.image,
  //   req.body.name,
  //   (err, response) => {
  //     if (err) {
  //       // Handle the error
  //       console.error(err, "error");
  //     } else {
  //       // Handle the response
  //       console.log(response, "upload response");
  //     }
  //   }
  // );

  // console.log("image_url", image_url);
};

module.exports = addCoin;
