const Wallet = require("../../models/Wallet");
const NotificationTokens = require("../../models/NotificationTokens");
const Withdraws = require("../../models/Withdraw");
var notifications = require("../../notifications.js");
var authFile = require("../../auth.js");
const axios = require("axios");
const Network = require("../../models/Network");
const CoinList = require("../../models/CoinList");
const ContractAddress = require("../../models/ContractAddress");
const { ObjectId } = require("mongodb");
const MailVerification = require("../../models/MailVerification");
const SMSVerification = require("../../models/SMSVerification");
const UserModel = require("../../models/User");
const ApiKeysModel = require("../../models/ApiKeys");
const ApiRequestModel = require("../../models/ApiRequests");
const Web3 = require("web3");
const OneStepWithdrawModel = require("../../models/OneStepWithdraw");
const contractABI = require("./contract.json");
const tokenABI = require("./token.json");
function PostRequestSync(url, data) {
  return new Promise((resolve, reject) => {
    axios
      .post(url, data)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
}

const withdraw = async (req, res) => {
  // console.log("req.body", req.body);
  var api_key_result = req.body.api_key;

  let api_result = await authFile.apiKeyChecker(api_key_result);
  let apiRequest = "";

  if (api_result === false) {
    let checkApiKeys = "";

    checkApiKeys = await ApiKeysModel.findOne({
      api_key: api_key_result,
      withdraw: "1",
    }).exec();

    if (checkApiKeys != null) {
      apiRequest = new ApiRequestModel({
        api_key: api_key_result,
        request: "withdraw",
        ip: req.body.ip ?? req.connection.remoteAddress,
        user_id: checkApiKeys.user_id,
      });
      await apiRequest.save();
    } else {
      res.json({ status: "fail", message: "Forbidden 403" });
      return;
    }
  }

  var user_id = req.body.user_id;
  var coin_id = req.body.coin_id;
  var network_id = req.body.network_id;
  var to = req.body.toAddress;
  var amount = req.body.amount;
  var api_key_result = req.body.api_key;

  /*
  var api_result = await authFile.apiKeyChecker(api_key_result);
  if (api_result === false) {
    res.json({ status: "fail", message: "Forbidden 403" });
    return;
  }
  */

  let isOneStep = false;

  if (
    user_id == null ||
    coin_id == null ||
    network_id == null ||
    to == null ||
    amount == null
  ) {
    res.json({
      status: "fail",
      message: "invalid_params",
      showableMessage: "Fill all fields",
    });
    return;
  }

  if (user_id.length != 24) {
    res.json({
      status: "fail",
      message: "invalid_params",
      showableMessage: "Invalid User ID",
    });
    return;
  }

  let user = await UserModel.findOne({ _id: user_id }).exec();
  if (user == null) {
    res.json({
      status: "fail",
      message: "user_not_found",
      showableMessage: "User not found",
    });
    return;
  }

  const checkCoin = await CoinList.findOne({ _id: coin_id }).exec();
  if (checkCoin == null) {
    res.json({
      status: "fail",
      showableMessage: "Coin not Found",
      message: "Coin not found",
    });
    return;
  }

  amount = parseFloat(amount);
  var fromWallet = await Wallet.findOne({
    coin_id: coin_id,
    user_id: user_id,
  }).exec();
  if (fromWallet == null) {
    res.json({
      status: "fail",
      showableMessage: "Wallet not found",
      message: "unknow_error",
    });
    return;
  }
  let networkInfo = await Network.findOne({ _id: network_id });
  if (networkInfo == null) {
    res.json({
      status: "fail",
      showableMessage: "Network not found",
      message: "network_not_found",
    });
    return;
  }
  let balance = parseFloat(fromWallet.amount);
  if (amount <= 0) {
    res.json({
      status: "fail",
      showableMessage: "Invalid Amount",
      message: "invalid_amount",
    });
    return;
  }
  if (balance <= amount) {
    res.json({
      status: "fail",
      showableMessage: "Low Balance",
      message: "invalid_balance",
    });
    return;
  }

  let oneStepWithdrawCheck = await OneStepWithdrawModel.findOne({
    user_id: user_id,
  }).exec();

  if (oneStepWithdrawCheck != null) {
    isOneStep = true;

    let maxAmount = parseFloat(oneStepWithdrawCheck.maxAmount, 4);

    let price = 0;

    if (CoinList.symbol == "USDT") {
      price = 1;
    } else {
      let getPrice = await axios(
        "http://global.oxhain.com:8542/price?symbol=" +
          checkCoin.symbol +
          "USDT"
      );
      price = getPrice.data.data.ask;
    }

    let amountUSDT = parseFloat(amount) * parseFloat(price);

    if (amountUSDT > maxAmount) {
      isOneStep = false;
    }

    //check last 24 hours withdraw amount
    let last24HoursWithdraw = await Withdraws.find({
      user_id: user_id,
      createdAt: {
        $gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
      },
    }).exec();

    let last24HoursWithdrawAmount = 0;

    for (let i = 0; i < last24HoursWithdraw.length; i++) {
      //calcualate amount in usdt
      let price = 0;
      let coinInfo = await CoinList.findOne({
        _id: last24HoursWithdraw[i].coin_id,
      }).exec();
      if (coinInfo.symbol == "USDT") {
        price = 1;
      } else {
        let getPrice = await axios(
          "http://global.oxhain.com:8542/price?symbol=" +
            coinInfo.symbol +
            "USDT"
        );
        price = getPrice.data.data.ask;
      }

      let amountUSDT =
        parseFloat(last24HoursWithdraw[i].amount) * parseFloat(price);

      last24HoursWithdrawAmount += amountUSDT;
    }
    if (last24HoursWithdrawAmount + amount > maxAmount) {
      isOneStep = false;
    }
  }

  let transaction = null;
  let coinInfo = null;

  if (isOneStep == false) {
    var email = user["email"];
    var phone = user["phone_number"];

    let check1 = "";
    let check3 = "";

    if (email != undefined && email != null && email != "") {
      check1 = await MailVerification.findOne({
        user_id: user_id,
        reason: "withdraw",
        pin: req.body.mailPin,
        status: 0,
      }).exec();

      if (!check1)
        return res.json({
          status: "fail",
          message: "verification_failed",
          showableMessage: "Wrong Mail Pin",
        });
    }

    if (phone != undefined && phone != null && phone != "") {
      check3 = await SMSVerification.findOne({
        user_id: user_id,
        reason: "withdraw",
        pin: req.body.smsPin,
        status: 0,
      }).exec();

      if (!check3)
        return res.json({
          status: "fail",
          message: "verification_failed",
          showableMessage: "Wrong SMS Pin",
        });
    }

    if (check1 != "") {
      check1.status = 1;
      check1.save();
    }

    if (check3 != "") {
      check3.status = 1;
      check3.save();
    }
  }

  let isError = false;
  let tx_id = "";

  switch (networkInfo.symbol) {
    case "TRC":
      transaction = await PostRequestSync(
        "http://" + process.env.TRC20HOST + "/transfer",
        {
          from: process.env.TRCADDR,
          to: to,
          pkey: process.env.TRCPKEY,
          amount: (amount * 1000000).toString(),
        }
      );
      if (transaction.data.status != "success") {
        res.json({ status: "fail", message: "unknow error" });
        isError = true;
      } else {
        isError = false;
        tx_id = transaction.data.data;
      }

      break;
    case "BSC":
      console.log("in case bsc");
      coinInfo = await CoinList.findOne({ _id: coin_id });
      console.log("coinInfo", coinInfo);

      // if (coinInfo.symbol == "BNB") {
      if (coinInfo.symbol == "ZFT") {
        // transaction = await PostRequestSync(
        //   "http://" + process.env.BSC20HOST + "/transfer",
        //   {
        //     from: process.env.BSCADDR,
        //     to: to,
        //     pkey: process.env.BSCPKEY,
        //     amount: amount,
        //   }
        // );

        //// testing fund transfer

        // Create a new instance of Web3 and connect to the Binance Smart Chain network
        const web3 = new Web3(
          "https://data-seed-prebsc-1-s2.binance.org:8545/"
        );
        // console.log("web3", web3.eth);
        // const contract = new web3.eth.Contract(
        //   contractABI,
        //   "0xb7D1469E57a5eFED4aE95DF557DfE9De65a310De"
        // );
        // console.log("contract", contract.methods);
        // Set up the token contract address and the recipient's wallet address
        const tokenContractAddress =
          "0x8AfA5fc45241A53dE2a09D00BaA580Daf2506ad5"; ///zift token  88471.27684
        let amo = web3.utils.toWei("10");
        console.log(amo, "am0");

        // Set up the contract address and the recipient's wallet address
        const contractAddress = "0xb7D1469E57a5eFED4aE95DF557DfE9De65a310De";
        const recipientAddress = "0x0c661FB2512B66B40668b057395869A48Cf2606c";

        // Set up your wallet private key
        const privateKey =
          "0xa789761db2289fc2bd7838ae42bffb3c399beab6dc9ed3a942a695804da66152";

        // Create a new contract instance using the ABI and contract address
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        // console.log("contract", contract);
        // Define the amount of tokens to send (in the smallest decimal unit)
        const amount = web3.utils.toWei("10");

        // Create a transaction object
        // const transactionObject = contract.methods.transfer(
        //   recipientAddress,
        //   amount
        // );
        const transactionObject = contract.methods.takeAssets(
          tokenContractAddress,
          "0x59B9248c7166D40C07388615Bc2141b5222A9A9B",
          recipientAddress,
          amount
        );
        // console.log("transactionObject", transactionObject);
        // Estimate the gas required for the transaction
        transactionObject
          .estimateGas({ from: "0x59B9248c7166D40C07388615Bc2141b5222A9A9B" })
          .then((gasLimit) => {
            // Build the raw transaction
            const rawTransaction = {
              to: contractAddress,
              gasLimit: web3.utils.toHex(gasLimit),
              gasPrice: web3.utils.toHex(amount),
              data: transactionObject.encodeABI(),
            };

            // Sign the transaction with your private key
            const signedTransaction = web3.eth.accounts.signTransaction(
              rawTransaction,
              privateKey
            );

            // Send the signed transaction
            web3.eth
              .sendSignedTransaction(signedTransaction.rawTransaction)
              .on("receipt", (receipt) => {
                console.log("Transaction receipt:", receipt);
              })
              .on("error", (error) => {
                console.error("Error:", error);
              });
          })
          .catch((error) => {
            console.error("Estimate gas error:", error);
          });

        ////approve
        // const token = new web3.eth.Contract(tokenABI, tokenContractAddress);
        // let approve = await token.methods
        //   .approve("0xb7D1469E57a5eFED4aE95DF557DfE9De65a310De", amo)
        //   .send({ from: "0x59B9248c7166D40C07388615Bc2141b5222A9A9B" })
        //   .then((response) => {
        //     console.log("Transaction response:", response);
        //   });

        // const recipientAddress = "0x0c661FB2512B66B40668b057395869A48Cf2606c";

        // let res = await contract.methods
        //   .takeAssets(
        //     tokenContractAddress,
        //     "0x59B9248c7166D40C07388615Bc2141b5222A9A9B",
        //     recipientAddress,
        //     amo
        //   )
        //   .send({ from: "0x59B9248c7166D40C07388615Bc2141b5222A9A9B" })
        //   .then((response) => {
        //     console.log("Transaction response:", response);
        //   });

        // console.log(res, "res");

        // Set up your wallet private key
        // const privateKey =
        //   "0xa789761db2289fc2bd7838ae42bffb3c399beab6dc9ed3a942a695804da66152";

        // Create a transaction object
        // const transactionObject = {
        //   from: "0x59B9248c7166D40C07388615Bc2141b5222A9A9B",
        //   to: tokenContractAddress,
        //   data:
        //     "0xa9059cbb" +
        //     web3.eth.abi
        //       .encodeParameters(["address", "uint256"], [recipientAddress, 100])
        //       .substr(2),
        // };

        // Estimate the gas required for the transaction
        // web3.eth
        //   .estimateGas(transactionObject)
        //   .then((gasLimit) => {
        //     // Build the raw transaction
        //     const rawTransaction = {
        //       from: "0x59B9248c7166D40C07388615Bc2141b5222A9A9B",
        //       to: tokenContractAddress,
        //       gasLimit: web3.utils.toHex(gasLimit),
        //       gasPrice: web3.utils.toHex(web3.utils.toWei("10", "gwei")),
        //       data: transactionObject.data,
        //     };

        //     // Sign the transaction with your private key
        //     const signedTransaction = web3.eth.accounts.signTransaction(
        //       rawTransaction,
        //       privateKey
        //     );

        //     // Send the signed transaction
        //     // web3.eth
        //     //   .sendSignedTransaction(signedTransaction.rawTransaction)
        //     //   .on("receipt", (receipt) => {
        //     //     // console.log("Transaction receipt:", receipt);
        //     //     console.log("Transaction receipt:");
        //     //   })
        //     //   .on("error", (error) => {
        //     //     // console.error("Error:", error);
        //     //     console.error("Error:");
        //     //   });
        //   })
        //   .catch((error) => {
        //     console.error("Estimate gas error:");
        //   });

        ///end testing fund transfer

        if (transaction.data.status != "success") {
          res.json({ status: "fail", message: "unknow error" });
          isError = true;
        } else {
          isError = false;
          tx_id = transaction.data.data;
        }
      } else {
        transaction = await PostRequestSync(
          "http://" + process.env.BSC20HOST + "/contract_transfer",
          {
            token: coinInfo.symbol,
            from: process.env.BSCADDR,
            to: to,
            pkey: process.env.BSCPKEY,
            amount: amount,
          }
        );
        if (transaction.data.status != "success") {
          res.json({ status: "fail", message: "unknow error" });
          isError = true;
        } else {
          isError = false;
          tx_id = transaction.data.data;
        }
      }

      break;
    case "ERC":
      coinInfo = await CoinList.findOne({ _id: coin_id });
      if (coinInfo.symbol == "ETH") {
        transaction = await PostRequestSync(
          "http://" + process.env.ERC20HOST + "/transfer",
          {
            from: process.env.ERCADDR,
            to: to,
            pkey: process.env.ERCPKEY,
            amount: amount,
          }
        );
        if (transaction.data.status != "success") {
          res.json({ status: "fail", message: "unknow error" });
          isError = true;
        } else {
          isError = false;
          tx_id = transaction.data.data;
        }
      } else {
        transaction = await PostRequestSync(
          "http://" + process.env.ERC20HOST + "/contract_transfer",
          {
            token: coinInfo.symbol,
            from: process.env.ERCADDR,
            to: to,
            pkey: process.env.ERCPKEY,
            amount: amount,
          }
        );
        if (transaction.data.status != "success") {
          res.json({ status: "fail", message: "unknow error" });
          isError = true;
        } else {
          isError = false;
          tx_id = transaction.data.data;
        }
      }
      break;
    case "SEGWIT":
      transaction = await axios.request({
        method: "post",
        url: "http://" + process.env.BTCSEQHOST,
        data: "request=transfer&to=" + to + "&amount=" + amount,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      if (transaction.data.status != "success") {
        res.json({ status: "fail", message: transaction.data.message });
        isError = true;
      } else {
        isError = false;
        tx_id = transaction.data.data;
      }
      break;
    default:
      res.json({ status: "fail", message: "Invalid network" });
      isError = true;
      break;
  }

  let data = new Withdraws({
    user_id: user_id,
    coin_id: fromWallet.coin_id,
    amount: amount,
    network_id: network_id,
    to: to,
    fee: 0.0,
    tx_id: tx_id,
    status: isError ? -1 : 1,
  });

  await data.save();

  if (isError == false) {
    fromWallet.amount = parseFloat(fromWallet.amount) - amount;
    await fromWallet.save();
    let response = await NotificationTokens.findOne({
      user_id: user_id,
    });
    if (response == null) {
    } else {
      var token = response["token_id"];
      var body =
        "A withdraw order has been given from your account. Please wait for the admin to confirm your order.\n\n";
      notifications.sendPushNotification(token, body);
    }
    return res.json({ status: "success", data: data });
  }
  return res.json({ status: "fail", message: "unknow error" });
};

module.exports = withdraw;
