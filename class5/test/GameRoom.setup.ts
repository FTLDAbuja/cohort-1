import { keccak256, toBytes, parseEther, type Address, Account } from "viem";
import { network } from "hardhat";

// Enum values matching the contract
export const Currency = {
    USDC: 0,
    USDT: 1,
} as const;

export const SplitRule = {
    Top1: 0,
    Top2: 1,
    Top3: 2,
} as const;

export const RoomStatus = {
    Active: 0,
    Pending: 1,
    Cancelled: 2,
    Completed: 3,
} as const;

// Helper function to hash string to bytes32
export function hashString(str: string): `0x${string}` {
    return keccak256(toBytes(str));
}

// Helper function to create CreateRoomParams
export function createRoomParams(overrides: Partial<{
    name: string;
    gameId: string;
    roomCode: string;
    entryFee: bigint;
    maxPlayers: bigint;
    sponsorAmount: bigint;
    startTime: bigint;
    endTime: bigint;
    paymentAmount: bigint;
    isSponsored: boolean;
    isPrivate: boolean;
    isSpecial: boolean;
    currency: number;
    winnerSplitRule: number;
}>) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return {
        name: overrides.name ?? "Test Room",
        gameId: overrides.gameId ?? "game-1",
        roomCode: overrides.roomCode ?? "ROOM123",
        entryFee: overrides.entryFee ?? parseEther("1"),
        maxPlayers: overrides.maxPlayers ?? 10n,
        sponsorAmount: overrides.sponsorAmount ?? 0n,
        startTime: overrides.startTime ?? now,
        endTime: overrides.endTime ?? now + 3600n,
        paymentAmount: overrides.paymentAmount ?? parseEther("1"),
        isSponsored: overrides.isSponsored ?? false,
        isPrivate: overrides.isPrivate ?? false,
        isSpecial: overrides.isSpecial ?? false,
        currency: overrides.currency ?? Currency.USDT,
        winnerSplitRule: overrides.winnerSplitRule ?? SplitRule.Top1,
    };
}

export interface TestAccounts {
    owner: Account;
    creator: Account;
    participant1: Account;
    participant2: Account;
    participant3: Account;
    participant4: Account;
}

export async function setupContracts() {
    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();
    const [owner] = await viem.getWalletClients();

    // Deploy USDT token
    const usdt = await viem.deployContract("USDTTether", [owner.account.address]);

    // Deploy USDC token
    const usdc = await viem.deployContract("USDC", [owner.account.address]);

    // Deploy GameRoomContract
    const gameRoom = await viem.deployContract("GameRoomContract", [
        usdt.address,
        usdc.address,
    ]);

    return { usdc, usdt, gameRoom, publicClient };
}

export async function getTestAccounts(): Promise<TestAccounts> {
    const { viem } = await network.connect();
    const [owner, creator, player1, player2, player3] = await viem.getWalletClients();

    return {
        owner: owner.account,
        creator: creator.account,
        participant1: player1.account,
        participant2: player2.account,
        participant3: player3.account,
        participant4: player3.account,
    };
}

export async function mintTokens(
    usdc: any,
    usdt: any,
    accounts: TestAccounts,
    amount: bigint = parseEther("10000")
) {
    // Mint USDT
    if (usdt) {
        await usdt.write.mint([accounts.owner.address, amount], { account: accounts.owner });
        await usdt.write.mint([accounts.creator.address, amount], { account: accounts.owner });
        await usdt.write.mint([accounts.participant1.address, amount], { account: accounts.owner });
        await usdt.write.mint([accounts.participant2.address, amount], { account: accounts.owner });
        await usdt.write.mint([accounts.participant3.address, amount], { account: accounts.owner });
        await usdt.write.mint([accounts.participant4.address, amount], { account: accounts.owner });
    }

    // Mint USDC
    if (usdc) {
        await usdc.write.mint([accounts.owner.address, amount], { account: accounts.owner });
        await usdc.write.mint([accounts.creator.address, amount], { account: accounts.owner });
        await usdc.write.mint([accounts.participant1.address, amount], { account: accounts.owner });
        await usdc.write.mint([accounts.participant2.address, amount], { account: accounts.owner });
        await usdc.write.mint([accounts.participant3.address, amount], { account: accounts.owner });
        await usdc.write.mint([accounts.participant4.address, amount], { account: accounts.owner });
    }
}

export async function approveTokens(
    token: any,
    spender: Address,
    amount: bigint,
    owner: Account
) {
    await token.write.approve([spender, amount], { account: owner });
}

export function getFutureTimestamp(seconds: number = 3600): bigint {
    return BigInt(Math.floor(Date.now() / 1000) + seconds);
}
