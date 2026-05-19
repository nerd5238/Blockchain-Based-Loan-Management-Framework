const mongoose = require("mongoose");

const LoanRecordSchema = new mongoose.Schema(
  {
    loanId: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },
    userId: {
      type:     String,
      required: true,
      trim:     true,
    },
    amount: {
      type:     Number,
      required: true,
      min:      0,
    },
    interest: {
      type:     Number,
      required: true,
      min:      0,
    },
    duration: {                     // in months
      type:     Number,
      required: true,
      min:      1,
    },
    status: {
      type:    String,
      enum:    ["ACTIVE", "REPAID", "DEFAULTED", "PENDING"],
      default: "ACTIVE",
    },
    timestamp: {                    // epoch ms — set on creation, never changed
      type:     Number,
      required: true,
    },

    // ── Blockchain audit fields ──────────────────────────
    currentHash: {                  // hash of the latest record state
      type: String,
    },
    blockchainTxHash: {             // Ethereum tx hash returned by Ganache
      type: String,
    },
    hashHistory: [                  // immutable append-only audit trail in DB
      {
        hash:      String,
        txHash:    String,
        updatedAt: { type: Date, default: Date.now },
        reason:    String,          // "CREATED" | "UPDATED"
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoanRecord", LoanRecordSchema);
