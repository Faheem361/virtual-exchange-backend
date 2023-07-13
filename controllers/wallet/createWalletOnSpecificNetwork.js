const Wallet = require("../../models/Wallet");
var authFile = require("../../auth.js");
const CoinList = require("../../models/CoinList");
const ApiKeysModel = require("../../models/ApiKeys");
const ApiRequest = require("../../models/ApiRequests");
const Network = require("../../models/Network");
const WalletAddress = require("../../models/WalletAddress");
const Web3 = require("web3");

const createWalletOnSpecificNetwork = async function (req, res) {
  var api_key_result = req.body.api_key;
  var network = req.body.network_id;
  let api_result = await authFile.apiKeyChecker(api_key_result);
  let apiRequest = "";

  if (api_result === false) {
    let checkApiKeys = "";

    checkApiKeys = await ApiKeysModel.findOne({
      api_key: api_key_result,
      get_balance: "1",
    }).exec();

    if (checkApiKeys != null) {
      apiRequest = new ApiRequest({
        api_key: api_key_result,
        request: "createWallet",
        ip: req.body.ip ?? req.connection.remoteAddress,
        user_id: checkApiKeys.user_id,
      });
      await apiRequest.save();
    } else {
      return res.json({
        status: "fail",
        showableMessage: "Failed! forbidden 403",
        message: "Forbidden 403",
      });
    }
  }

  let networks = await Network.find({ status: 1 }).exec();
  console.log("networks", networks);

  // for (let x = 0; x < networks.length; x++) {
  let walletAddressCheck = await WalletAddress.findOne({
    user_id: req.body.user_id,
    network_id: network,
  }).exec();

  if (walletAddressCheck == null) {
    let privateKey = "";
    let address = "";

    // console.log("networks[x].symbol", networks[x].symbol);

    let networkCheck = await Network.findOne({
      _id: network,
      status: 1,
    }).exec();
    console.log("networkCheck", networkCheck);
    if (networkCheck.symbol == "BSC") {
      // let url = "http://" + process.env.BSC20HOST + "/create_address";
      // let walletTest = await axios.post(url);
      const web3 = new Web3("https://bsc-dataseed.binance.org/");
      let walletTest = await web3.eth.accounts.create();
      console.log("wallet", walletTest);
      privateKey = walletTest.privateKey;
      address = walletTest.address;

      let coins = await CoinList.find({
        network: networkCheck.name,
        status: 1,
      }).exec();
      console.log("coins", coins);
      for (let i = 0; i < coins.length; i++) {
        const newWallet = new Wallet({
          coinName: coins[i]["name"],
          symbol: coins[i]["symbol"],
          user_id: req.body.user_id,
          amount: 0,
          coin_id: coins[i]["id"],
          type: "spot",
          address: walletTest.address,
          // privateKey: walletTest.privateKey,
          status: 1,
        });
        await newWallet.save();
      }
      console.log("privateKey", privateKey, address);
      let walletAddress = new WalletAddress({
        user_id: req.body.user_id,
        network_id: networkCheck._id,
        private_key: privateKey,
        wallet_address: address,
      });
      await walletAddress.save();
      return res.json({
        status: "success",
        showableMessage: "Wallet Created",
        data: {
          user_id: req.body.user_id,
          network_id: networkCheck._id,
          wallet_address: address,
        },
      });
    } else {
      return res.json({
        success: "success",
        showableMessage: "Wallet not found",
        message: "wallet_not_found",
      });
    }
  } else {
    let wallets = await Wallet.findOne({
      user_id: req.body.user_id,
      coin_id: req.body.coin_id,
    }).exec();
    console.log("wallets", wallets);
    if (wallets != null) {
      return res.json({
        status: "Success",
        showableMessage: "Wallet already exist",
        message: "wallet_already_exist",
      });
    } else {
      let networkCheck = await Network.findOne({
        _id: network,
        status: 1,
      }).exec();
      let coins = await CoinList.find({
        _id: req.body.coin_id,
        network: networkCheck.name,
        status: 1,
      }).exec();
      console.log("coins", coins);
      if (coins.length == 0)
        return res.json({
          status: "success",
          showableMessage: "Coin not found",
          message: "coin_not_found",
        });
      const newWallet = new Wallet({
        coinName: coins[0].name,
        symbol: coins[0].symbol,
        user_id: req.body.user_id,
        amount: 0,
        coin_id: req.body.coin_id,
        type: "spot",
        address: walletAddressCheck.wallet_address,
        // privateKey: walletAddressCheck.private_key,
        status: 1,
      });
      console.log("newWallet in wallet created", newWallet);
      await newWallet.save();
      return res.json({
        status: "success",
        showableMessage: "Wallet Created",
        data: {
          user_id: req.body.user_id,
          network_id: req.body.network_id,
          wallet_address: walletAddressCheck.wallet_address,
        },
      });
    }
  }
  // }
};

module.exports = createWalletOnSpecificNetwork;
