const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../../models/User");

const secret = speakeasy.generateSecret({ length: 20 });
const token = speakeasy.totp({
  secret: secret.base32,
  encoding: "base32",
});
const QRSecretCode = async (req, res) => {
  await User.findByIdAndUpdate(req.body.user_id, {
    twofa: secret.hex,
  }).exec();

  QRCode.toDataURL(secret.otpauth_url, function (err, data_url) {
    return res
      .status(200)
      .json({ status: "success", data: data_url, secret: secret });
  });
};
module.exports = QRSecretCode;
