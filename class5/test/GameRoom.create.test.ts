import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import { setupContracts, getTestAccounts, mintTokens, approveTokens, getFutureTimestamp, Currency, SplitRule, RoomStatus } from "../test/GameRoom.setup.js";

describe("GameRoom - Create", async function () {
    it("Should create a game room with USDC", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        const tx = await gameRoom.write.createGameRoom(
            [
                {
                    name: "Test Room",
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
        assert.equal(roomId, 1n);

        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(room[0], roomId); // id
        assert.equal(room[1], entryFee); // entryFee
        assert.equal(room[2], 4n); // maxPlayers
        assert.equal(room[3], startTime); // startTime
        assert.equal(room[4], endTime); // endTime
        assert.equal(room[5], entryFee); // totalPrizePool
        assert.ok(typeof room[6] === 'bigint'); // createdAt (timestamp)
        assert.equal(room[7], 1n); // activePlayersCount
        assert.equal(Number(room[8]), Currency.USDC); // currency (USDC)
        assert.equal(Number(room[9]), SplitRule.Top1); // winnerSplitRule (TOP_1)
        assert.equal(Number(room[10]), RoomStatus.Pending); // status (PENDING = 1)
        assert.equal(room[11].toLowerCase(), accounts.creator.address); // creator
        assert.equal(room[12].length, 1); // participantList
    });

    it("Should create a game room with USDT", async function () {
        const { gameRoom, usdt } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(null, usdt, accounts, parseEther("1000"));

        const entryFee = parseEther("50");
        await approveTokens(usdt, gameRoom.address, entryFee, accounts.creator);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "USDT Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(3),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top2,
                    currency: Currency.USDT,
                },
            ],
            { account: accounts.creator }
        );

        const roomId = await gameRoom.read.roomCounter() - 1n;
        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(Number(room[8]), Currency.USDT); // currency (USDT)
        assert.equal(Number(room[9]), SplitRule.Top2); // winnerSplitRule (TOP_2)
    });

    it("Should create room with TOP_3 split rule", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "TOP_3 Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(5),
                    startTime: startTime,
                    endTime: endTime,
                    splitRule: SplitRule.Top3,
                    currency: Currency.USDC,
                },
            ],
            { account: accounts.creator }
        );

        const roomId = await gameRoom.read.roomCounter() - 1n;
        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(Number(room[9]), SplitRule.Top3); // winnerSplitRule (TOP_3)
    });

    it("Should emit GameRoomCreated event", async function () {
        const { gameRoom, usdc, publicClient } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        const deploymentBlock = await publicClient.getBlockNumber();

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Event Test Room",
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

        const events = await publicClient.getContractEvents({
            address: gameRoom.address,
            abi: gameRoom.abi,
            eventName: "GameRoomCreated",
            fromBlock: deploymentBlock,
        });

        assert.equal(events.length, 1);
        assert.equal(events[0].args.creator?.toLowerCase(), accounts.creator.address.toLowerCase());
        assert.equal(events[0].args.entryFee, entryFee);
    });
});

