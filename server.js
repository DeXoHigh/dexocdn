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
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(compression());

// Start server
app.use((req, res, next) => {
  res.removeHeader("Connection");
  res.removeHeader("Content-Length");
  res.removeHeader("Transfer-Encoding");
  res.removeHeader("X-Powered-By");
  res.setHeader("Cache-Control", "public, max-age=31536000");
  res.setHeader("Expires", new Date(Date.now() + 31536000000).toUTCString());
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  if (req.url.includes("/js/")) {
    res.setHeader("Content-Type", "application/javascript");
  }
  next();
});

// Cache middleware
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = "__express__" + req.originalUrl || req.url;
    const cachedBody = cache.get(key);
    if (cachedBody) {
      res.send(cachedBody);
      return;
    }
    res.sendResponse = res.send;
    res.send = (body) => {
      cache.put(key, body, duration * 1000);
      res.sendResponse(body);
    };
    next();
  };
};

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
app.get("/images/:filename", cacheMiddleware(86400), (req, res) => {
  const starttime = new Date().getTime();
  const file = url.parse(req.url).pathname;
  const filePath = path.resolve("./public" + file);
  const cachedFile = cache.get(req.url);

  optimizeImageMiddleware(req, res, filePath, cachedFile, starttime);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ error: "Not found" });
  }

  if (cachedFile) {
    return res.sendFile(cachedFile);
  }

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

  const image = sharp(filePath);
  image.metadata().then((metadata) => {
    if (metadata.format === "jpeg") {
      image
        .jpeg({
          quality: 85,
          chromaSubsampling: "4:4:4",
          force: false,
        })
        .toBuffer()
        .then((data) => {
          cache.put(req.url, data, 86400000);
          return res.send(data);
        })
        .catch((err) => {
          console.log(err);
          return res.status(500).send({ error: "Internal server error" });
        });
    } else if (metadata.format === "png") {
      image
        .png({
          quality: 85,
          force: false,
        })
        .toBuffer()
        .then((data) => {
          cache.put(req.url, data, 86400000);
          return res.send(data);
        })
        .catch((err) => {
          console.log(err);
          return res.status(500).send({ error: "Internal server error" });
        });
    } else if (metadata.format === "webp") {
      image
        .webp({
          quality: 85,
          force: false,
        })
        .toBuffer()
        .then((data) => {
          cache.put(req.url, data, 86400000);
          return res.send(data);
        })
        .catch((err) => {
          console.log(err);
          return res.status(500).send({ error: "Internal server error" });
        });
    } else {
      return res.status(500).send({ error: "Internal server error" });
    }
  });

  image.on("error", (err) => {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  });

  image.on("info", (info) => {
    console.log(info);
  });
  
  image.on("warn", (err) => {
    console.log(err);
  });

  image.on("complete", (info) => {
    return res.send(info);
  });
});

// Js route - minify js
app.get("/js/:file", cacheMiddleware(86400), async (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  const starttime = new Date().getTime();
  const file = url.parse(req.url).pathname;
  const filePath = path.resolve("./public" + file);
  const readFile = fs.readFileSync(filePath, "utf8");

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Cannot GET " + file);
  }

  const minifiedBody = UglifyJS.minify(readFile);

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

  return res.send(minifiedBody.code);
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

// Optimize image middleware
const optimizeImageMiddleware = () => {
  return (req, res, next) => {
    const imagePath = path.join(__dirname, req.url);
    sharp(imagePath).toBuffer((err, buffer) => {
      if (err) return next();
      res.setHeader("Content-Type", "image/jpeg");
      res.send(buffer);
    });
  };
};

// Start server - if u try to start this and not work, u need to use a proxy like nginx
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