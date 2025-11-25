import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import { setupContracts, getTestAccounts, mintTokens, approveTokens, getFutureTimestamp, Currency, SplitRule, RoomStatus } from "../test/GameRoom.setup.js";

describe("GameRoom - Start", async function () {
    it("Should start game room when creator calls and time is right", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n; // Past time
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Start Test Room",
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

        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(Number(room[10]), RoomStatus.Active); // status should be ACTIVE (1)
    });

    it("Should prevent non-creator from starting room", async function () {
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
                    name: "Unauthorized Start Room",
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
                await gameRoom.write.startGameRoom([roomId], { account: accounts.participant1 });
            },
            (error: any) => {
                return error.message.includes("Unauthorized") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent starting room that is not PENDING", async function () {
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
                    name: "Already Started Room",
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

        // Try to start again
        await assert.rejects(
            async () => {
                await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });
            },
            (error: any) => {
                return error.message.includes("GameRoomNotPending") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent starting room before startTime", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = getFutureTimestamp(3600); // Future time
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Future Start Room",
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
                await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });
            },
            (error: any) => {
                return error.message.includes("InvalidTime") || error.message.includes("revert");
            }
        );
    });

    it("Should emit GameRoomStarted event", async function () {
        const { gameRoom, usdc, publicClient } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Event Start Room",
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
        const blockBefore = await publicClient.getBlock({ blockNumber: deploymentBlock });
        const timestampBefore = blockBefore.timestamp;

        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });

        const events = await publicClient.getContractEvents({
            address: gameRoom.address,
            abi: gameRoom.abi,
            eventName: "GameRoomStarted",
            fromBlock: deploymentBlock,
        });

        assert.equal(events.length, 1);
        assert.equal(events[0].args.name?.toLowerCase(), "event start room".toLowerCase());
        // Event emits block.timestamp, not startTime, so check it's a valid timestamp
        assert.ok(typeof events[0].args.timeStarted === 'bigint');
        assert.ok(events[0].args.timeStarted >= timestampBefore);
    });
});

