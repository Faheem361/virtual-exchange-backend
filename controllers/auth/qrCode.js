const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const secret = speakeasy.generateSecret({ length: 20 });
const token = speakeasy.totp({
  secret: secret.base32,
  encoding: "base32",
});
const QRSecretCode = (req, res) => {
  QRCode.toDataURL(secret.otpauth_url, function (err, data_url) {
    console.log(data_url);
    return res
      .status(200)
      .json({ status: "success", data: data_url, secret: secret });
  });
};
module.exports = QRSecretCode;
