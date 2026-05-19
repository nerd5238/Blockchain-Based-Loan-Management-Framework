require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const express    = require("express");
const cors       = require("cors");
const path       = require("path");
const connectDB  = require("../config/db");
const loanRoutes = require("./routes/loanRoutes");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve frontend (same server) ─────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── DB ────────────────────────────────────────────────────
connectDB();

// ── API Routes ────────────────────────────────────────────
app.use("/api/loans", loanRoutes);

// ── Status endpoint (for sidebar indicators) ─────────────
app.get("/api/status", async (req, res) => {
  const mongoose = require("mongoose");

  let blockchainOk = false;
  try {
    const { web3 } = require("../config/blockchain");
    await web3.eth.getBlockNumber();
    blockchainOk = true;
  } catch (_) {}

  res.json({
    mongo:      mongoose.connection.readyState === 1,
    blockchain: blockchainOk,
  });
});

// ── Catch-all: serve index.html for SPA navigation ───────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Global error handler ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`\n🏦  LoanLedger running at  → http://localhost:${PORT}`);
  console.log(`🔗  Blockchain RPC          → ${process.env.BLOCKCHAIN_RPC}`);
  console.log(`📄  Contract                → ${process.env.CONTRACT_ADDRESS}\n`);
});
