import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";

describe("MiniBank (Vulnerable)", async () => {
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

    bank = await viem.deployContract("MiniBank");

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

  it("should allow normal withdrawal", async () => {
    await user.writeContract({
      address: bank.address,
      abi: bank.abi,
      functionName: "deposit",
      value: viem.parseEther("1"),
    });

    await user.writeContract({
      address: bank.address,
      abi: bank.abi,
      functionName: "withdraw",
      args: [viem.parseEther("1")],
    });

    const balance = await bank.read.getBalance([user.account.address]);
    assert.equal(balance, 0n);
  });

  it("should be vulnerable to reentrancy attack", async () => {
    // Fund the bank with 5 ETH from user
    await user.writeContract({
      address: bank.address,
      abi: bank.abi,
      functionName: "deposit",
      value: viem.parseEther("5"),
    });

    // Attacker deposits 1 ETH to start attack
    await attackerEOA.writeContract({
      address: attacker.address,
      abi: attacker.abi,
      functionName: "attack",
      value: viem.parseEther("1"),
    });

    // Attacker should gain more than 1 ETH
    const attackerBalance = await publicClient.getBalance({
      address: attacker.address,
    });

    assert.ok(
      attackerBalance > viem.parseEther("1"),
      "Reentrancy did not drain funds as expected"
    );
  });
});
