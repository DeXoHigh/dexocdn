// DeXo CDN
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const url = require("url");
const express = require("express");
const cache = require("memory-cache");
const compression = require("compression");
const UglifyJS = require("uglify-js");
const sharp = require("sharp");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const app = express();
const port = process.env.PORT || 3000;
const useMongoDB = process.env.USE_MOGO_DB || false;

// Mongoose connection
if (useMongoDB === "true") {
  mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    console.log("Connected to MongoDB");
  }).catch((err) => {
    console.log("Error connecting to MongoDB");
    console.log(err);
    return process.exit(1);
  });
}

const ImageSchema = new Schema({
  url: String,
  time: Number,
  filename: String,
  loaded: String,
  expires: Number,
  userip: String
});

const JsSchema = new Schema({
  url: String,
  time: Number,
  filename: String,
  loaded: String,
  expires: Number,
  userip: String
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());

// Remove headers
app.use((req, res, next) => {
  res.removeHeader("Connection");
  res.removeHeader("Content-Length");
  res.removeHeader("Transfer-Encoding");
  res.removeHeader("X-Powered-By");
  res.setHeader("Cache-Control", "public, max-age=31536000");
  next();
});

// Unit converter
function units(bytes) {
    const units = ['ms', 's', 'm', 'h', 'd', 'y'];
    let unit = 0;
    while (bytes > 1024) {
        bytes /= 1024;
        unit++;
    }
    return `${Math.round(bytes)}${units[unit]}`;
}

// Image route - optimize image
app.get("/images/*", async (req, res) => {
  const starttime = new Date().getTime();
  const file = url.parse(req.url).pathname;
  const filePath = path.resolve("./public" + file);
  const cachedFile = cache.get(req.url);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ error: "Not found" });
  }

  if (cachedFile) {
    return res.sendFile(cachedFile);
  }

  const optimizedFilePath = await optimizeImage(filePath);
  cache.put(req.url, optimizedFilePath);
  res.sendFile(optimizedFilePath);
  if (useMongoDB === "true") {
    const endtime = new Date().getTime();
    const Image = mongoose.model("Image", ImageSchema);
    const loadtime = endtime - starttime;
    const userip = getRealIp(req);
    const image = new Image({
      url: req.url,
      time: starttime,
      filename: path.basename(filePath),
      loaded: units(loadtime),
      expires: endtime + 31536000000,
      userip: userip
    });
    image.save();
  }
});

// Js route - minify js
app.get("/js/*", async (req, res) => {
  const starttime = new Date().getTime();
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=31536000");

  const file = url.parse(req.url).pathname;
  const filePath = path.resolve("./public" + file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Cannot GET " + file);
  }

  const fileRead = fs.readFileSync(filePath, "utf8");
  const result = UglifyJS.minify(fileRead);

  if (result.error) {
    console.log(result && filePath);
    return res.status(500).send({ error: "Internal server error" });
  }

  res.send(result.code);
  if (useMongoDB === "true") {
    const endtime = new Date().getTime();
    const Js = mongoose.model("Js", JsSchema);
    const loadtime = endtime - starttime;
    const userip = getRealIp(req);
    const js = new Js({
      url: req.url,
      time: starttime,
      filename: path.basename(filePath),
      loaded: units(loadtime),
      expires: endtime + 31536000000,
      userip: userip
    });
    js.save();
  }
});

// Status - for monitoring
app.get("/status", async (req, res) => {
  if (useMongoDB === "true") {
    const Image = mongoose.model("Image", ImageSchema);
    const Js = mongoose.model("Js", JsSchema);
    const images = await Image.find({}).sort({ time: -1 }).lean();
    const js = await Js.find({}).sort({ time: -1 }).lean();
    res.send({ images, js });
  } else {
    res.send({ error: "MongoDB not enabled" });
  }
});

// Optimize image - if not already optimized
async function optimizeImage(filePath) {
  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);
  const optimizedFilePath = path.resolve(fileDir, fileName);

  if (!fs.existsSync(optimizedFilePath)) {
    await sharp(filePath).toFile(optimizedFilePath);
  }

  return optimizedFilePath;
}

// Start server
app.listen(port, () => {
  console.log(`Loading config from .env file`);
  setTimeout(() => {
    console.log(`Server listening on port ${process.env.PORT}`);
  }, 1000);
});

// Get real ip
function getRealIp(req) {
  return req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
}

// Error handler
process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});