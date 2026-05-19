const { web3, getContract, getAccount } = require("../../config/blockchain");

/**
 * Store a hash on-chain for a given loanId.
 * Returns the transaction receipt.
 */
const storeHashOnChain = async (loanId, hash) => {
  const contract = getContract();
  const account  = getAccount();

  const receipt = await contract.methods
    .storeRecord(loanId, hash)
    .send({ from: account, gas: 300000 });

  return receipt;
};

/**
 * Retrieve stored hash from blockchain for a given loanId.
 * Returns { hash, timestamp, exists }
 */
const getHashFromChain = async (loanId) => {
  const contract = getContract();

  const result = await contract.methods.getRecord(loanId).call();

  return {
    hash:      result[0],
    timestamp: result[1].toString(),
    exists:    result[2],
  };
};

module.exports = { storeHashOnChain, getHashFromChain };
