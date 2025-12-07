import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";

describe("SecureMiniBank (Protected)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  let bank: any;
  let attacker: any;
  let user: any;
  let attackerEOA: any;

  beforeEach(async () => {
    const accounts = await viem.getWalletClients();

    user = accounts[1];
    attackerEOA = accounts[2];

    bank = await viem.deployContract("SecureMiniBank");

    attacker = await viem.deployContract("Attacker", {
      args: [bank.address],
      client: { wallet: attackerEOA },
    });
  });

  it("should accept deposits", async () => {
    await user.writeContract({
      address: bank.address,
      abi: bank.abi,
      functionName: "deposit",
      value: viem.parseEther("1"),
    });

    const balance = await bank.read.getBalance([user.account.address]);
    assert.equal(balance, viem.parseEther("1"));
  });

  it("should prevent reentrancy attack", async () => {
    // Fund the bank with 5 ETH
    await user.writeContract({
      address: bank.address,
      abi: bank.abi,
      functionName: "deposit",
      value: viem.parseEther("5"),
    });

    // Attacker tries attack, should revert
    await assert.rejects(
      attackerEOA.writeContract({
        address: attacker.address,
        abi: attacker.abi,
        functionName: "attack",
        value: viem.parseEther("1"),
      }),
      /reentrant/,
    );

    // Attacker should not gain ETH
    const attackerBalance = await publicClient.getBalance({
      address: attacker.address,
    });

    assert.equal(attackerBalance, 0n);
  });
});
