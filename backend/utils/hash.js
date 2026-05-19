const crypto = require("crypto");

/**
 * Serialise a loan record into a deterministic string and return its SHA256 hash.
 * Field order is fixed so the same record always produces the same hash.
 *
 * @param {Object} loanData
 * @returns {string} hex digest
 */
const generateLoanHash = (loanData) => {
  const serialised = JSON.stringify({
    loanId:    loanData.loanId,
    userId:    loanData.userId,
    amount:    loanData.amount,
    interest:  loanData.interest,
    duration:  loanData.duration,
    status:    loanData.status,
    timestamp: loanData.timestamp,
  });

  return crypto.createHash("sha256").update(serialised).digest("hex");
};

module.exports = { generateLoanHash };
