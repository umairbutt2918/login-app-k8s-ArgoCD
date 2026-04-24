const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const db = require("./db");
const Redis = require("ioredis");

const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "mysecretkey";

/* ================= REDIS SETUP ================= */

const redis = new Redis({
  host: "redis-service",
  port: 6379
});

const subscriber = new Redis({
  host: "redis-service",
  port: 6379
});

// 🔥 Redis error handling (IMPORTANT)
redis.on("error", (err) => {
  console.log("Redis error:", err.message);
});

subscriber.on("error", (err) => {
  console.log("Redis subscriber error:", err.message);
});

// Pub/Sub
subscriber.subscribe("user-channel");

subscriber.on("message", (channel, message) => {
  console.log(`📩 [${channel}] ${message}`);
});

/* ================= AUTH MIDDLEWARE ================= */

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    // Check blacklist
    const isBlacklisted = await redis.get(`blacklist_${token}`);
    if (isBlacklisted) {
      return res.status(401).send("Session expired. Please login again.");
    }

    // Verify JWT
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    req.token = token;

    next();
  } catch (err) {
    return res.status(403).send("Invalid or expired token");
  }
};

/* ================= ROUTES ================= */

// SIGNUP
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

  db.query(sql, [username, email, password], (err) => {
    if (err) {
      console.error("Signup error:", err);
      return res.status(500).send("Signup failed");
    }

    // Redis publish
    redis.publish("user-channel", JSON.stringify({ email }));

    return res.status(201).send("Signup successful");
  });
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email=? AND password=?";

  db.query(sql, [email, password], (err, result) => {
    if (err || !result || result.length === 0) {
      return res.status(401).send({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ email }, SECRET, { expiresIn: "1h" });

    return res.send({ success: true, token });
  });
});

// PROTECTED
app.get("/profile", authMiddleware, (req, res) => {
  return res.send({
    message: "Protected data accessed",
    user: req.user
  });
});

// LOGOUT (FIXED)
app.post("/logout", authMiddleware, async (req, res) => {
  try {
    const token = req.token;

    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return res.status(400).send("Invalid token");
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    if (ttl > 0) {
      await redis.set(`blacklist_${token}`, "true", "EX", ttl);
    }

    return res.status(200).send({ message: "Logged out successfully" });

  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).send("Error during logout");
  }
});

/* ================= SERVER ================= */

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});