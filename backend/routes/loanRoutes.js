const express = require("express");
const router  = express.Router();

const {
  createLoan,
  updateLoan,
  verifyLoan,
  getLoan,
  getAllLoans,
} = require("../controllers/loanController");

// ── Loan Routes ───────────────────────────────────────────
router.get   ("/all",                   getAllLoans);
router.post  ("/create-loan",           createLoan);
router.post  ("/update-loan",           updateLoan);
router.get   ("/verify-loan/:loanId",   verifyLoan);
router.get   ("/loan/:loanId",          getLoan);

module.exports = router;
