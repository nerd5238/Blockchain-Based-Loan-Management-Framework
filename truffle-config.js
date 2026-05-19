module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,          // Default Ganache GUI port (use 8545 for ganache-cli)
      network_id: "*",
    },
  },
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: { enabled: true, runs: 200 },
      },
    },
  },
};
