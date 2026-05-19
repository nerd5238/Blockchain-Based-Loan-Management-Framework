// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * LoanLedger - Immutable audit trail for loan records.
 * Stores SHA256 hashes of loan data. No financial logic, no tokens.
 * Hash integrity only.
 */
contract LoanLedger {
    struct LoanEntry {
        string  hash;       // SHA256 hash of the loan record
        uint256 timestamp;  // Block timestamp when stored
        bool    exists;     // Guard for existence checks
    }

    // loanId (string) → LoanEntry
    mapping(string => LoanEntry) private records;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------
    event RecordStored(string indexed loanId, string hash, uint256 timestamp);

    // -------------------------------------------------------
    // Write: store a new hash (immutable — cannot overwrite)
    // -------------------------------------------------------
    function storeRecord(string calldata loanId, string calldata hash) external {
        require(bytes(loanId).length > 0, "loanId required");
        require(bytes(hash).length  > 0, "hash required");
        require(!records[loanId].exists, "Record already exists for this loanId");

        records[loanId] = LoanEntry({
            hash:      hash,
            timestamp: block.timestamp,
            exists:    true
        });

        emit RecordStored(loanId, hash, block.timestamp);
    }

    // -------------------------------------------------------
    // Read: retrieve stored hash + timestamp
    // -------------------------------------------------------
    function getRecord(string calldata loanId)
        external
        view
        returns (string memory hash, uint256 timestamp, bool exists)
    {
        LoanEntry storage entry = records[loanId];
        return (entry.hash, entry.timestamp, entry.exists);
    }
}
