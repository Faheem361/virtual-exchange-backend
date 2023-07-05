const Web3 = require("web3");
const contractABI = require("./contract.json");
const tokenABI = require("./token.json");
const WalletAddress = require("../../models/WalletAddress");
const CoinList = require("../../models/CoinList");
const Tx = require("@ethereumjs/tx").Transaction;
const Common = require("@ethereumjs/common").default;
const ApiRequestModel = require("../../models/ApiRequests");
const ApiKeysModel = require("../../models/ApiKeys");
var authFile = require("../../auth.js");
const Withdraw = require("../../models/Withdraw");
const Wallet = require("../../models/Wallet");

const withdrawOther = async (req, res) => {
  var user_id = req.body.user_id;
  var coin_id = req.body.coin_id;
  var network_id = req.body.network_id;
  var recipientAddress = req.body.toAddress;
  var amounts = req.body.amount;
  var api_key_result = req.body.api_key;

  ////checking api key auth
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
      res.json({
        status: "fail",
        showableMessage: "Forbidden 403",
        message: "Forbidden_403",
      });
      return;
    }
  }

  // Connect to the Binance Smart Chain testnet
  const web3 = new Web3("https://data-seed-prebsc-1-s2.binance.org:8545");
  const contractAddress = "0x2B0C073E7e9F18eF3502e628b46E17D94c05FBc7"; // Replace with the actual address on the testnet

  const getUserWallet = await WalletAddress.findOne({
    user_id: user_id,
  }).exec();

  if (getUserWallet == null)
    return res.json({
      success: "success",
      showableMessage: "User wallet not Found",
      message: "wallet_not_Found",
    });
  //   Your private key
  const pvKey = getUserWallet.private_key.slice(2);
  const privateKey = Buffer.from(pvKey, "hex");

  ///get coin address

  let tokenContractAddress = await CoinList.findById(coin_id);

  tokenContractAddress = tokenContractAddress.contract_address;
  const fromAddress = getUserWallet.wallet_address;
  const contract = new web3.eth.Contract(contractABI, contractAddress);
  const token = new web3.eth.Contract(tokenABI, tokenContractAddress);
  const amount = web3.utils.toWei(amounts.toString());
  // The method you want to call and its parameters

  const sendSignedTransaction = async (
    fromAddress,
    contractAddress,
    contractMethod
  ) => {
    try {
      const nonce = await web3.eth.getTransactionCount(fromAddress, "pending");

      const gasPrice = await web3.eth.getGasPrice();
      const gasLimit = await contractMethod.estimateGas({ from: fromAddress });

      const txData = {
        nonce: web3.utils.toHex(nonce),
        gasPrice: web3.utils.toHex(gasPrice),
        gasLimit: web3.utils.toHex(gasLimit),
        to: contractAddress,
        data: contractMethod.encodeABI(),
      };

      const common = Common.forCustomChain(
        "mainnet",
        {
          name: "binance",
          networkId: 97,
          chainId: 97,
        },
        "petersburg"
      );
      const transaction = Tx.fromTxData(txData, { common });
      const signedTransaction = transaction.sign(privateKey);

      const receipt = await web3.eth
        .sendSignedTransaction(
          "0x" + signedTransaction.serialize().toString("hex")
        )
        .on("transactionHash", (hash) => {
          console.log("Transaction hash:", hash);
        })
        .on("receipt", (receipt) => {
          // console.log("Receipt:", receipt);
        })
        .on("confirmation", async (confirmationNumber, receipt) => {
          console.log("receipt", receipt);
          // return res.json({
          //   stauts: "success",
          //   showableMessage: "success",
          //   data: receipt,
          // });
        })
        .on("error", (error) => {
          console.error("Error:", error);
          return res.json({
            stauts: "fail",
            showableMessage: "fail",
            error: error,
          });
        })
        .then(async (receipt) => {
          console.log("Final receipt:", receipt.transactionHash);
          let data = new Withdraw({
            user_id: user_id,
            coin_id: coin_id,
            amount: amounts,
            network_id: network_id,
            to: recipientAddress,
            fee: 0.0,
            tx_id: receipt.transactionHash,
            status: 1,
          });

          await data.save();
          let fromWallet = await Wallet.findOne({
            address: fromAddress,
          }).exec();

          fromWallet.amount =
            parseFloat(fromWallet.amount) - parseFloat(amounts);

          await fromWallet.save();
          // let response = await NotificationTokens.findOne({
          //   user_id: user_id,
          // });
          // if (response == null) {
          // } else {
          //   var token = response["token_id"];
          //   var body =
          //     "A withdraw order has been given from your account. Please wait for the admin to confirm your order.\n\n";
          //   notifications.sendPushNotification(token, body);
          // }
          return res.json({
            stauts: "success",
            showableMessage: "success",
            data: receipt,
          });
        });
      //   console.log("Transaction receipt:", receipt);
    } catch (error) {
      console.error("An error occurred while sending the transaction:", error);
      return res.json({
        stauts: "fail",
        showableMessage: "forbidden 403",
        message: "forbidden_403",
      });
    }
  };
  const approveTokens = async (contractAddress, tokenApprove) => {
    try {
      const nonce = await web3.eth.getTransactionCount(fromAddress, "pending");
      console.log("nonce", nonce);
      const gasPrice = await web3.eth.getGasPrice();
      console.log("gasPrice", gasPrice);

      const gasLimit = await tokenApprove.estimateGas({ from: fromAddress });
      console.log("gasLimit", gasLimit);

      const txData = {
        nonce: web3.utils.toHex(nonce),
        gasPrice: web3.utils.toHex(gasPrice),
        gasLimit: web3.utils.toHex(gasLimit) || web3.utils.toHex("2000000"),
        to: tokenContractAddress,
        data: tokenApprove.encodeABI(),
      };

      const common = Common.forCustomChain(
        "mainnet",
        {
          name: "binance",
          networkId: 97,
          chainId: 97,
        },
        "petersburg"
      );
      const transaction = Tx.fromTxData(txData, { common });
      const signedTransaction = transaction.sign(privateKey);

      const receipt = await web3.eth.sendSignedTransaction(
        "0x" + signedTransaction.serialize().toString("hex")
      );

      console.log("Transaction receipt:", receipt);
    } catch (error) {
      console.error("An error occurred while sending the transaction:", error);
    }
  };

  ///approve
  const tokenApprove = token.methods.approve(contractAddress, amount);
  await approveTokens(contractAddress, tokenApprove);

  ////send tokens
  const contractMethod = contract.methods.takeAssets(
    tokenContractAddress,
    fromAddress,
    recipientAddress,
    amount
  );
  await sendSignedTransaction(fromAddress, contractAddress, contractMethod);
};

///withdraw native currency

const withdrawNative = async (req, res) => {
  var user_id = req.body.user_id;
  var coin_id = req.body.coin_id;
  var network_id = req.body.network_id;
  var recipientAddress = req.body.toAddress;
  var amounts = req.body.amount;
  var api_key_result = req.body.api_key;

  ///checking api_key results
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
      res.json({
        status: "fail",
        showableMessage: "Forbidden 403",
        message: "Forbidden_403",
      });
      return;
    }
  }

  // Connect to the Binance Smart Chain testnet
  const web3 = new Web3("https://data-seed-prebsc-1-s2.binance.org:8545");
  const contractAddress = "0x2B0C073E7e9F18eF3502e628b46E17D94c05FBc7"; // Replace with the actual address on the testnet

  const getUserWallet = await WalletAddress.findOne({
    user_id: user_id,
  }).exec();

  if (getUserWallet == null)
    return res.json({
      success: "success",
      showableMessage: "User wallet not Found",
      message: "wallet_not_Found",
    });
  //   Your private key
  const pvKey = getUserWallet.private_key.slice(2);
  const privateKey = Buffer.from(pvKey, "hex");

  ///get coin address

  let tokenContractAddress = await CoinList.findById(coin_id);
  tokenContractAddress = tokenContractAddress.contract_address;

  //   const privateKey =
  //     "0xa789761db2289fc2bd7838ae42bffb3c399beab6dc9ed3a942a695804da66152";
  // The contract's ABI and the testnet address
  // Replace with the actual ABI
  //   const contractAddress = "0xb7D1469E57a5eFED4aE95DF557DfE9De65a310De"; // Replace with the actual address on the testnet
  //   const recipientAddress = "0x0c661FB2512B66B40668b057395869A48Cf2606c";

  // Create a contract instance
  //   const tokenContractAddress = "0x8AfA5fc45241A53dE2a09D00BaA580Daf2506ad5"; ///zift token  88471.27684
  const fromAddress = getUserWallet.wallet_address;
  const contract = new web3.eth.Contract(contractABI, contractAddress);
  const token = new web3.eth.Contract(tokenABI, tokenContractAddress);
  const amount = web3.utils.toWei(amounts.toString());
  // The method you want to call and its parameters

  const sendSignTransaction = async (
    fromAddress,
    contractAddress,
    contractMethod
  ) => {
    try {
      const nonce = await web3.eth.getTransactionCount(fromAddress, "pending");
      const gasPrice = await web3.eth.getGasPrice();
      const gasLimit = await contractMethod.estimateGas({ from: fromAddress });
      const txData = {
        nonce: nonce,
        gasPrice: web3.utils.toHex(gasPrice),
        gasLimit: web3.utils.toHex(gasLimit),
        to: recipientAddress,
        from: fromAddress,
        value: web3.utils.toHex(amount),
        data: contractMethod.encodeABI(),
      };

      const common = Common.forCustomChain(
        "mainnet",
        {
          name: "testnet",
          networkId: 97,
          chainId: 97,
        },
        "petersburg"
      );
      const transaction = Tx.fromTxData(txData, { common });
      const signedTransaction = transaction.sign(privateKey);

      const receipt = await web3.eth
        .sendSignedTransaction(
          "0x" + signedTransaction.serialize().toString("hex")
        )
        .on("transactionHash", (hash) => {
          console.log("Transaction hash:", hash);
        })
        .on("receipt", (receipt) => {
          console.log("Receipt:", receipt);
        })
        .on("confirmation", (confirmationNumber, receipt) => {
          console.log("confirmationNumber:", confirmationNumber);
        })
        .on("error", (error) => {
          console.error("Error:", error);
          return res.json({
            stauts: "success",
            showableMessage: "Error",
            data: error,
          });
        })
        .then(async (receipt) => {
          console.log("Final receipt:", receipt);
          let data = new Withdraw({
            user_id: user_id,
            coin_id: coin_id,
            amount: amounts,
            network_id: network_id,
            to: recipientAddress,
            fee: 0.0,
            tx_id: receipt.transactionHash,
            status: 1,
          });

          await data.save();
          let fromWallet = await Wallet.findOne({
            address: fromAddress,
          }).exec();

          fromWallet.amount =
            parseFloat(fromWallet.amount) - parseFloat(amounts);

          await fromWallet.save();
        });
      //   console.log("Transaction receipt:", receipt);
    } catch (error) {
      console.error("An error occurred while sending the transaction:", error);
      return res.json({
        stauts: "fail",
        showableMessage: "forbidden 403",
        message: "forbidden_403",
      });
    }
  };

  ////send tokens
  const options = amount;
  const contractMethod = contract.methods.curTransfer(
    recipientAddress
    // options
  );
  await sendSignTransaction(fromAddress, contractAddress, contractMethod);
};

module.exports = { withdrawOther, withdrawNative };
