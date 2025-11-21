import { network } from "hardhat"
import { assert } from "node:console";

const { viem } = await network.connect({
    network: "hardhatOp",
    chainType: "op"
});

const publicClient = await viem.getPublicClient();
const [senderClient, client1, client2] = await viem.getWalletClients();
const senderAddress = senderClient.account.address;
console.log(senderAddress);
const contract = await viem.deployContract("FTLDToken", ["FTLD Token", "FTLD"]);
const owner = await contract.read.owner();
console.log("Owner = ", owner)

type Contract = typeof contract;


const getTotalSupply = async (contract: Contract) => {
    const supply = await contract.read.totalSupply();
    console.log("========Total Supply of tokens=======")
    console.log(supply);

}

const mintToken = async (contract: Contract, to: `0x${string}`, amount: number) => {
    const data = await contract.write.mint([to, BigInt(amount)], {
        account: senderClient.account
    })
    console.log("Transaction hash: ", data);

    console.log("======Transaction details========");
    const transactionDetails = await publicClient.getTransactionReceipt({ hash: data });
    console.log(transactionDetails);
    const mintEvent = await publicClient.getContractEvents({
        address: contract.address,
        abi: contract.abi,
        eventName: "TokenMinted"
    })
    console.log("=======Mint event==========")
    console.log(mintEvent)
}
const transferToken = async (contract: Contract, from: `0x${string}`, to: `0x${string}`, amount: number) => {
    const data = await contract.write.transfer([from, to, BigInt(amount)], {
        account: senderClient.account
    })
    console.log("Transaction hash: ", data);

    console.log("======Transaction details========");
    const transactionDetails = await publicClient.getTransactionReceipt({ hash: data });
    console.log(transactionDetails);
    const mintEvent = await publicClient.getContractEvents({
        address: contract.address,
        abi: contract.abi,
        eventName: "TokenTransferred"
    })
    console.log("=======Transfer event==========")
    console.log(mintEvent)
}

const main = async () => {
    await getTotalSupply(contract);
    await mintToken(contract, client1.account.address, 20);
    console.log("Checking client1 balance");
    const balance = await contract.read.balanceOf([client1.account.address]);
    console.log(balance);

    console.log("Transferring from client1 to client2")
    await transferToken(contract, client1.account.address, client2.account.address, 10)
    console.log("Checking new client1 balance");
    const newBalance1 = await contract.read.balanceOf([client1.account.address]);
    console.log(newBalance1);
    console.log("Checking client2 balance");
    const newBalance2 = await contract.read.balanceOf([client2.account.address]);
    console.log(newBalance2);
    console.log("Done with lifecycle test");
}

main();