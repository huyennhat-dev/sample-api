const express = require("express");
const cors = require("cors");
const lowDb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const bodyParser = require("body-parser");
const { nanoid } = require("nanoid");
const db = lowDb(new FileSync("data.json"));
const fs = require("fs");
let rawdata = fs.readFileSync("data.json");
let routes = JSON.parse(rawdata);
const fileUpload = require("express-fileupload");

const PORT = 80;

db.defaults({ products: [] }).write();

const app = express();

const modules = Object.keys(routes);

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(
  fileUpload({
    useTempFiles: true,
  })
);

const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: "huyennhat",
  api_key: "836136537452954",
  api_secret: "qsXAaQH1f5b5zcLCtXu7-p0NTto",
});

app.get("/", (req, res) => {
  res.send(
    `<h2 align="center" style="margin-top: 100px;">SUNTECH DEMO API</h2>`
  );
});

app.post("/api/login", (req, res) => {
  const user = db
    .get("users")
    .find({ email: req.body.email, password: req.body.password })
    .value();

  if (!user) {
    res.json({ success: false });
  } else {
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    });
  }
});

modules.forEach((moduleName) => {
  app.get(`/api/${moduleName}`, (req, res) => {
    const data = db.get(`${moduleName}`).value();
    return res.json(data);
  });

  app.get(`/api/${moduleName}/:id`, (req, res) => {
    const data = db.get(`${moduleName}`).find({ id: req.params.id });
    return res.json(data);
  });

  app.post(`/api/${moduleName}`, async (req, res) => {
    const note = req.body;
    console.log(note);
    await cloudinary.uploader.upload(
      note.image,
      { folder: "images" },
      async (err, rs) => {
        if (err) return res.status(409).json({ status: false });

        await db
          .get(`${moduleName}`)
          .push({
            name: note.name,
            price: note.price,
            desc: note.desc,
            image: rs.url,
            id: nanoid(),
          })
          .write();

        res.status(200).json({ success: true });
      }
    );
  });

  const public_id = (imageURL) => imageURL.split("/").pop().split(".")[0];

  app.put(`/api/${moduleName}/:id`, async (req, res) => {
    let isUploading = false;
    const note = req.body;
    const data = await db
      .get(`${moduleName}`)
      .find({ id: req.params.id })
      .value();

    const que = async (data) =>
      await db
        .get(`${moduleName}`)
        .find({ id: req.params.id })
        .assign(data)
        .write();

    if (note.name != data.name) que({ name: note.name });
    if (note.price != data.price) que({ price: note.price });
    if (note.desc != data.desc) que({ desc: note.desc });

    if (note.image != data.image) {
      await cloudinary.uploader
        .destroy(`images/${public_id(data.image)}`)
        .then(async (rs) => {
          await cloudinary.uploader
            .upload(note.image, { folder: "images" })
            .then((res) => que({ image: res.url }));
        });
    }
    return res.json({ success: true });
  });

  app.delete(`/api/${moduleName}/:id`, (req, res) => {
    const data = db.get(`${moduleName}`).find({ id: req.params.id }).value();

    cloudinary.uploader
      .destroy(`images/${public_id(data.image)}`)
      .then((result) => {
        db.get(`${moduleName}`).remove({ id: req.params.id }).write();
        res.json({ success: true });
      });
  });
});

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
});
