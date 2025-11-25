import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import { setupContracts, getTestAccounts, mintTokens, approveTokens, getFutureTimestamp, Currency, SplitRule, RoomStatus } from "../test/GameRoom.setup.js";

describe("GameRoom - Join", async function () {
    it("Should allow participant to join room", async function () {
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
                    name: "Join Test Room",
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

        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(room[5], entryFee * 2n); // totalPrizePool should be doubled
        assert.equal(room[7], 2n); // activePlayersCount should be 2
        assert.equal(room[12].length, 2); // participantList should have 2 participants
    });

    it("Should prevent joining when room is not PENDING", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 2n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n; // Past time
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Started Room",
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
                await gameRoom.write.addToRoom([roomId], { account: accounts.participant1 });
            },
            (error: any) => {
                return error.message.includes("GameRoomNotPending") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent joining when max players reached", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 3n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant2);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Max Players Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(2), // Only 2 players max
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

        // Should fail when trying to add 3rd player
        await assert.rejects(
            async () => {
                await gameRoom.write.addToRoom([roomId], { account: accounts.participant2 });
            },
            (error: any) => {
                return error.message.includes("MaxPlayersReached") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent same participant from joining twice", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 2n, accounts.creator);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Duplicate Test Room",
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

        await assert.rejects(
            async () => {
                await gameRoom.write.addToRoom([roomId], { account: accounts.creator });
            },
            (error: any) => {
                return error.message.includes("ParticipantAlreadyInRoom") || error.message.includes("revert");
            }
        );
    });

    it("Should emit GameRoomJoined event", async function () {
        const { gameRoom, usdc, publicClient } = await setupContracts();
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
                    name: "Event Join Room",
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
        const deploymentBlock = await publicClient.getBlockNumber();

        await gameRoom.write.addToRoom([roomId], { account: accounts.participant1 });

        const events = await publicClient.getContractEvents({
            address: gameRoom.address,
            abi: gameRoom.abi,
            eventName: "GameRoomJoined",
            fromBlock: deploymentBlock,
        });

        const joinEvents = events.filter(
            (e: any) => e.args.participant?.toLowerCase() === accounts.participant1.address.toLowerCase()
        );
        assert.equal(joinEvents.length, 1);
        assert.equal(joinEvents[0].args.entryFee, entryFee);
    });
});

