const Network = require("../../models/Network");

const addNetwork = async (req, res) => {
  const check = await Network.findOne({
    name: req.body.name,
    symbol: req.body.symbol,
  }).exec();

  if (check != null) {
    return res.json({
      status: "success",
      showablemessage: "Network already added",
      data: "Network already added",
    });
  }
  const newData = new Network({
    name: req.body.name,
    symbol: req.body.symbol,
    status: 1,
  });

  newData.save().then((data) => {
    return res.json({
      status: "success",
      showablemessage: "data_added",
      data: data,
    });
  });
};

module.exports = addNetwork;
