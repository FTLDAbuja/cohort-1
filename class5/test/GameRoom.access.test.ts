import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import { setupContracts, getTestAccounts, mintTokens, approveTokens, getFutureTimestamp, Currency, SplitRule } from "../test/GameRoom.setup.js";

describe("GameRoom - Access Control", async function () {
    it("Should only allow creator to start room", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Access Start Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(4),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top1,
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId = await gameRoom.read.roomCounter() - 1n;

        // Creator can start
        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });

        // Others cannot start
        await assert.rejects(
            async () => {
                await gameRoom.write.startGameRoom([roomId], { account: accounts.participant1 });
            },
            (error: any) => {
                return error.message.includes("Unauthorized") || error.message.includes("revert");
            }
        );
    });

    it("Should only allow creator to cancel room", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        // Approve enough for both rooms (allowance is consumed, not restored on refund)
        await approveTokens(usdc, gameRoom.address, entryFee * 2n, accounts.creator);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Access Cancel Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(4),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top1,
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId = await gameRoom.read.roomCounter() - 1n;

        // Creator can cancel
        await gameRoom.write.cancelGameRoom([roomId], { account: accounts.creator });

        // Others cannot cancel
        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Access Cancel Room 2",
                    entryFee: entryFee,
                    maxPlayers: BigInt(4),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top1,
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId2 = await gameRoom.read.roomCounter() - 1n;

        await assert.rejects(
            async () => {
                await gameRoom.write.cancelGameRoom([roomId2], { account: accounts.participant1 });
            },
            (error: any) => {
                return error.message.includes("Unauthorized") || error.message.includes("revert");
            }
        );
    });

    it("Should only allow creator to complete room", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 2n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = BigInt(Math.floor(Date.now() / 1000)) - 50n;

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Access Complete Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(4),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top1,
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId = await gameRoom.read.roomCounter() - 1n;
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant1 });
        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });
        await gameRoom.write.updateScore([roomId, accounts.participant1.address, 1000n], {
            account: accounts.creator,
        });

        // Others cannot complete
        await assert.rejects(
            async () => {
                await gameRoom.write.completeGameRoom([roomId], { account: accounts.participant1 });
            },
            (error: any) => {
                return error.message.includes("Unauthorized") || error.message.includes("revert");
            }
        );

        // Creator can complete
        await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });
    });

    it("Should only allow creator to update scores", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 2n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Access Score Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(4),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top1,
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId = await gameRoom.read.roomCounter() - 1n;
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant1 });
        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });

        // Creator can update score
        await gameRoom.write.updateScore([roomId, accounts.participant1.address, 1000n], {
            account: accounts.creator,
        });

        // Others cannot update score
        await assert.rejects(
            async () => {
                await gameRoom.write.updateScore([roomId, accounts.participant1.address, 2000n], {
                    account: accounts.participant1,
                });
            },
            (error: any) => {
                return error.message.includes("Unauthorized") || error.message.includes("revert");
            }
        );
    });
});

