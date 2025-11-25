import { network } from "hardhat";
import { parseEther } from "viem";


/**
 * Deploys to base sepolia testnet network
 * USDC: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
 * USDT: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
 */

const usdc = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const usdt = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
async function main() {
    const { viem } = await network.connect({
        network: "baseSepolia",
        chainType: "op",
    });
    const [deployer] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    console.log("Deploying contracts with account:", deployer.account.address);

    // Deploy USDC
    // console.log("Deploying USDC...");
    // const usdc = await viem.deployContract("USDC", [deployer.account.address]);
    // await publicClient.waitForTransactionReceipt({ hash: usdc.address as any });
    // console.log("USDC deployed to:", usdc.address);

    // Deploy USDT
    // console.log("Deploying USDT...");
    // const usdt = await viem.deployContract("USDTTether", [deployer.account.address]);
    // await publicClient.waitForTransactionReceipt({ hash: usdt.address as any });
    // console.log("USDT deployed to:", usdt.address);

    // Deploy GameRoomContract
    console.log("Deploying GameRoomContract...");
    const gameRoom = await viem.deployContract("GameRoomContract", [
        usdt,
        usdc,
    ]);
    await publicClient.waitForTransactionReceipt({ hash: gameRoom.address as any });
    console.log("GameRoomContract deployed to:", gameRoom.address);

    // Optionally mint tokens to deployer for testing
    console.log("\nMinting tokens to deployer for testing...");
    const mintAmount = parseEther("100000");

    // const mintUsdcTx = await usdc.write.mint([deployer.account.address, mintAmount], {
    //     account: deployer.account,
    // });
    // await publicClient.waitForTransactionReceipt({ hash: mintUsdcTx });
    // console.log(`Minted ${mintAmount} USDC to deployer`);

    // const mintUsdtTx = await usdt.write.mint([deployer.account.address, mintAmount], {
    //     account: deployer.account,
    // });
    // await publicClient.waitForTransactionReceipt({ hash: mintUsdtTx });
    // console.log(`Minted ${mintAmount} USDT to deployer`);

    console.log("\n=== Deployment Summary ===");
    // console.log("USDC Address:", usdc.address);
    // console.log("USDT Address:", usdt.address);
    console.log("GameRoomContract Address:", gameRoom.address);
    console.log("Deployer Address:", deployer.account.address);
    console.log("\nDeployment completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

