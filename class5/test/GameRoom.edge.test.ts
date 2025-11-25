import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import { setupContracts, getTestAccounts, mintTokens, approveTokens, getFutureTimestamp, Currency, SplitRule, RoomStatus } from "../test/GameRoom.setup.js";

describe("GameRoom - Edge Cases", async function () {
    it("Should handle room with only creator (no other participants)", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = BigInt(Math.floor(Date.now() / 1000)) - 50n;

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Solo Room",
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
        await gameRoom.write.updateScore([roomId, accounts.creator.address, 1000n], {
            account: accounts.creator,
        });

        const balanceBefore = await usdc.read.balanceOf([accounts.creator.address]);
        await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });
        const balanceAfter = await usdc.read.balanceOf([accounts.creator.address]);

        // Creator should get all prize (100% in TOP_1)
        assert.equal(balanceAfter - balanceBefore, entryFee);
    });

    it("Should handle room with tied scores (first participant wins)", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 3n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant2);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = BigInt(Math.floor(Date.now() / 1000)) - 50n;

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Tied Scores Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(4),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top1, // TOP_1
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId = await gameRoom.read.roomCounter() - 1n;
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant1 });
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant2 });
        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });

        // Set same scores
        await gameRoom.write.updateScore([roomId, accounts.creator.address, 1000n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant1.address, 1000n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant2.address, 1000n], {
            account: accounts.creator,
        });

        // Should complete successfully (first in list wins)
        await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });

        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(Number(room[10]), RoomStatus.Completed); // COMPLETED
    });

    it("Should handle TOP_2 with only 1 participant", async function () {
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
                    name: "TOP_2 Solo Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(4),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top2, // TOP_2
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId = await gameRoom.read.roomCounter() - 1n;
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant1 });
        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });
        await gameRoom.write.updateScore([roomId, accounts.creator.address, 1000n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant1.address, 500n], {
            account: accounts.creator,
        });

        // Should complete - 2 participants split prize (60/40)
        await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });

        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(Number(room[10]), RoomStatus.Completed); // COMPLETED
    });

    it("Should handle TOP_3 with only 2 participants", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 3n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant2);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = BigInt(Math.floor(Date.now() / 1000)) - 50n;

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "TOP_3 Two Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(4),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top3, // TOP_3
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId = await gameRoom.read.roomCounter() - 1n;
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant1 });
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant2 });
        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });
        await gameRoom.write.updateScore([roomId, accounts.creator.address, 1000n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant1.address, 500n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant2.address, 300n], {
            account: accounts.creator,
        });

        // Should complete - 3 participants split prize (50/30/20)
        await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });

        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(Number(room[10]), RoomStatus.Completed); // COMPLETED
    });

    it("Should handle multiple rooms simultaneously", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 2n, accounts.creator);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        // Create first room
        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Room 1",
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

        const roomId1 = await gameRoom.read.roomCounter() - 1n;

        // Create second room
        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Room 2",
                    entryFee: entryFee,
                    maxPlayers: BigInt(4),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top2,
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId2 = await gameRoom.read.roomCounter() - 1n;

        assert.notEqual(roomId1, roomId2);

        const room1 = await gameRoom.read.fetchGameRoomDetails([roomId1]);
        const room2 = await gameRoom.read.fetchGameRoomDetails([roomId2]);

        assert.equal(room1[0], roomId1);
        assert.equal(room2[0], roomId2);
        assert.equal(Number(room1[9]), SplitRule.Top1); // TOP_1
        assert.equal(Number(room2[9]), SplitRule.Top2); // TOP_2
    });
});

