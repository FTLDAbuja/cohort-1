import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import { setupContracts, getTestAccounts, mintTokens, approveTokens, getFutureTimestamp, Currency, SplitRule, RoomStatus } from "../test/GameRoom.setup.js";

describe("GameRoom - Score", async function () {
    it("Should allow creator to update participant score", async function () {
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
                    name: "Score Test Room",
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

        // Note: We can't directly read participants mapping, but we can verify through completeGameRoom
        // For now, we'll just verify the transaction succeeded
        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(Number(room[10]), RoomStatus.Active); // status should still be ACTIVE
    });

    it("Should prevent non-creator from updating score", async function () {
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
                    name: "Unauthorized Score Room",
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

        await assert.rejects(
            async () => {
                await gameRoom.write.updateScore([roomId, accounts.participant1.address, 1000n], {
                    account: accounts.participant1,
                });
            },
            (error: any) => {
                return error.message.includes("Unauthorized") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent updating score when room is not ACTIVE", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 2n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Pending Score Room",
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

        await assert.rejects(
            async () => {
                await gameRoom.write.updateScore([roomId, accounts.participant1.address, 1000n], {
                    account: accounts.creator,
                });
            },
            (error: any) => {
                return error.message.includes("GameRoomNotActive") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent updating score for non-participant", async function () {
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
                    name: "Non Participant Score Room",
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
        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });

        await assert.rejects(
            async () => {
                await gameRoom.write.updateScore([roomId, accounts.participant1.address, 1000n], {
                    account: accounts.creator,
                });
            },
            (error: any) => {
                return error.message.includes("ParticipantNotInRoom") || error.message.includes("revert");
            }
        );
    });
});

