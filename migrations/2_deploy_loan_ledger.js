const LoanLedger = artifacts.require("LoanLedger");

module.exports = function (deployer) {
  deployer.deploy(LoanLedger);
};
