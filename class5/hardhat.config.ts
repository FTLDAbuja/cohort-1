import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    lisk: {
      type: "http",
      chainType: "op",
      chainId: 1135,
      url: "https://rpc.api.lisk.com",
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    liskSepolia: {
      type: "http",
      chainId: 4202,
      chainType: "op",
      url: "https://rpc.sepolia-api.lisk.com",
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    baseSepolia: {
      type: "http",
      chainId: 84532,
      chainType: "op",
      url: "https://base-sepolia.drpc.org",
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
});
