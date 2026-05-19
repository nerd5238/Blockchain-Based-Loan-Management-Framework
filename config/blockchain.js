const { Web3 } = require("web3");
const fs        = require("fs");
const path      = require("path");

// ── ABI ──────────────────────────────────────────────────
// Truffle writes the compiled artifact to build/contracts/
const artifactPath = path.join(
  __dirname,
  "../build/contracts/LoanLedger.json"
);

if (!fs.existsSync(artifactPath)) {
  throw new Error(
    "LoanLedger.json not found. Run `truffle compile && truffle migrate` first."
  );
}

const artifact       = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const CONTRACT_ABI   = artifact.abi;

// ── Web3 instance ────────────────────────────────────────
const web3 = new Web3(process.env.BLOCKCHAIN_RPC || "http://127.0.0.1:7545");

// ── Contract instance ────────────────────────────────────
const getContract = () => {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address || address === "0xYourDeployedContractAddress") {
    throw new Error(
      "CONTRACT_ADDRESS not set in .env — deploy the contract first."
    );
  }
  return new web3.eth.Contract(CONTRACT_ABI, address);
};

// ── Signing account (Ganache account — NOT MetaMask) ─────
const getAccount = () => {
  const account = process.env.BLOCKCHAIN_ACCOUNT;
  if (!account) throw new Error("BLOCKCHAIN_ACCOUNT not set in .env");
  return account;
};

module.exports = { web3, getContract, getAccount };
