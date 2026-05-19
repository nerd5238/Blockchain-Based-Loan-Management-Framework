const LoanRecord                    = require("../models/LoanRecord");
const { generateLoanHash }          = require("../utils/hash");
const { storeHashOnChain, getHashFromChain } = require("../blockchain/ledger");

// ── POST /api/loans/create ────────────────────────────────────────────────────
const createLoan = async (req, res) => {
  try {
    const { loanId, userId, amount, interest, duration, status } = req.body;

    // 1. Validate required fields
    if (!loanId || !userId || amount == null || interest == null || !duration) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // 2. Check for duplicate
    const exists = await LoanRecord.findOne({ loanId });
    if (exists) {
      return res.status(409).json({ error: `Loan ${loanId} already exists.` });
    }

    // 3. Build the record (timestamp fixed at creation)
    const timestamp = Date.now();
    const loanData  = {
      loanId, userId,
      amount:   Number(amount),
      interest: Number(interest),
      duration: Number(duration),
      status:   status || "ACTIVE",
      timestamp,
    };

    // 4. Generate SHA256 hash
    const hash = generateLoanHash(loanData);

    // 5. Store hash on blockchain
    const receipt = await storeHashOnChain(loanId, hash);
    const txHash  = receipt.transactionHash;

    // 6. Persist to MongoDB
    const loan = new LoanRecord({
      ...loanData,
      currentHash:      hash,
      blockchainTxHash: txHash,
      hashHistory: [{ hash, txHash, reason: "CREATED" }],
    });
    await loan.save();

    return res.status(201).json({
      message:         "Loan created and recorded on blockchain.",
      loanId,
      hash,
      blockchainTxHash: txHash,
    });
  } catch (err) {
    console.error("[createLoan]", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ── POST /api/loans/update ────────────────────────────────────────────────────
/**
 * Updates a mutable field (status only for now).
 * Generates a NEW hash, appends it to hashHistory in MongoDB.
 * NOTE: blockchain is APPEND-ONLY — the original hash remains immutable on-chain.
 * The updated hash is stored under a prefixed key: "UPDATE-<loanId>-<n>".
 */
const updateLoan = async (req, res) => {
  try {
    const { loanId, status } = req.body;

    if (!loanId || !status) {
      return res.status(400).json({ error: "loanId and status are required." });
    }

    // 1. Fetch existing record
    const loan = await LoanRecord.findOne({ loanId });
    if (!loan) {
      return res.status(404).json({ error: `Loan ${loanId} not found.` });
    }

    // 2. Apply update
    loan.status = status;

    // 3. Re-hash the updated record (timestamp is unchanged — only status changes)
    const loanData = {
      loanId:   loan.loanId,
      userId:   loan.userId,
      amount:   loan.amount,
      interest: loan.interest,
      duration: loan.duration,
      status:   loan.status,
      timestamp: loan.timestamp,
    };
    const newHash = generateLoanHash(loanData);

    // 4. Store updated hash on blockchain under a versioned key
    const versionKey = `UPDATE-${loanId}-${loan.hashHistory.length}`;
    const receipt    = await storeHashOnChain(versionKey, newHash);
    const txHash     = receipt.transactionHash;

    // 5. Update MongoDB
    loan.currentHash      = newHash;
    loan.blockchainTxHash = txHash;
    loan.hashHistory.push({ hash: newHash, txHash, reason: "UPDATED" });
    await loan.save();

    return res.status(200).json({
      message:         "Loan updated and new hash recorded on blockchain.",
      loanId,
      newHash,
      blockchainTxHash: txHash,
      versionKey,
    });
  } catch (err) {
    console.error("[updateLoan]", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ── GET /api/loans/verify/:loanId ─────────────────────────────────────────────
const verifyLoan = async (req, res) => {
  try {
    const { loanId } = req.params;

    // 1. Fetch record from DB
    const loan = await LoanRecord.findOne({ loanId });
    if (!loan) {
      return res.status(404).json({ error: `Loan ${loanId} not found.` });
    }

    // 2. Re-compute hash from current DB state
    const loanData = {
      loanId:   loan.loanId,
      userId:   loan.userId,
      amount:   loan.amount,
      interest: loan.interest,
      duration: loan.duration,
      status:   loan.status,
      timestamp: loan.timestamp,
    };
    const recomputedHash = generateLoanHash(loanData);

    // 3. Fetch original hash from blockchain
    const onChain = await getHashFromChain(loanId);

    if (!onChain.exists) {
      return res.status(404).json({ error: "No blockchain record found for this loanId." });
    }

    // 4. Compare
    const isValid = recomputedHash === onChain.hash;

    return res.status(200).json({
      loanId,
      integrity:        isValid ? "✅ VALID" : "⚠️  TAMPERED",
      recomputedHash,
      blockchainHash:   onChain.hash,
      blockchainTimestamp: new Date(Number(onChain.timestamp) * 1000).toISOString(),
      dbCurrentHash:    loan.currentHash,
      hashHistory:      loan.hashHistory,
    });
  } catch (err) {
    console.error("[verifyLoan]", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ── GET /api/loans/:loanId ────────────────────────────────────────────────────
const getLoan = async (req, res) => {
  try {
    const loan = await LoanRecord.findOne({ loanId: req.params.loanId });
    if (!loan) return res.status(404).json({ error: "Loan not found." });
    return res.status(200).json(loan);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── GET /api/loans/all ────────────────────────────────────────────────────────
const getAllLoans = async (req, res) => {
  try {
    const loans = await LoanRecord.find().sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ loans });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { createLoan, updateLoan, verifyLoan, getLoan, getAllLoans };
