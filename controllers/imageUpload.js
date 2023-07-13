const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Image = require("../models/image.js");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "assets/uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// GET API handler
exports.getImages = function (req, res) {
  Image.find({}, (err, images) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else {
      res.json({ items: images });
    }
  });
};

// POST API handler
exports.uploadImage = function (req, res) {
  //   console.log("req", req.file.path);

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
    }
  });
};
// exports.uploadImage = (req, res) => {
//   console.log("req", req);
//   return new Promise((resolve, reject) => {
//     upload.single("image")(req, res, (err) => {
//       if (err) {
//         reject(err);
//       } else {
//         // Retrieve the file path of the uploaded image
//         const filePath = req.file.path;

//         // Construct the image URL based on the file path
//         const imageUrl =
//           req.protocol + "://" + req.get("host") + "/" + filePath;

//         resolve(imageUrl);
//       }
//     });
//   });
// };
