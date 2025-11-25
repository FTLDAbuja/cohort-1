import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import { setupContracts, getTestAccounts, mintTokens, approveTokens, getFutureTimestamp, Currency, SplitRule, RoomStatus } from "../test/GameRoom.setup.js";

describe("GameRoom - Leave", async function () {
    it("Should allow participant to leave room and get refund", async function () {
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
                    name: "Leave Test Room",
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

        const balanceBefore = await usdc.read.balanceOf([accounts.participant1.address]);
        const roomBefore = await gameRoom.read.fetchGameRoomDetails([roomId]);

        await gameRoom.write.leaveGameRoom([roomId], { account: accounts.participant1 });

        const balanceAfter = await usdc.read.balanceOf([accounts.participant1.address]);
        const roomAfter = await gameRoom.read.fetchGameRoomDetails([roomId]);

        assert.equal(balanceAfter - balanceBefore, entryFee);
        assert.equal(roomAfter[5], roomBefore[5] - entryFee); // totalPrizePool decreased
        assert.equal(roomAfter[7], roomBefore[7] - 1n); // activePlayersCount decreased
        assert.equal(roomAfter[12].length, roomBefore[12].length - 1); // participantList decreased
    });

    it("Should prevent leaving room that is not PENDING", async function () {
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
                    name: "Started Leave Room",
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
                await gameRoom.write.leaveGameRoom([roomId], { account: accounts.participant1 });
            },
            (error: any) => {
                return error.message.includes("GameRoomNotPending") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent non-participant from leaving", async function () {
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
                    name: "Non Participant Leave Room",
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
                await gameRoom.write.leaveGameRoom([roomId], { account: accounts.participant1 });
            },
            (error: any) => {
                return error.message.includes("ParticipantNotInRoom") || error.message.includes("revert");
            }
        );
    });

    it("Should emit GameRoomParticipantLeft event", async function () {
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
                    name: "Event Leave Room",
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

        const deploymentBlock = await publicClient.getBlockNumber();

        await gameRoom.write.leaveGameRoom([roomId], { account: accounts.participant1 });

        const events = await publicClient.getContractEvents({
            address: gameRoom.address,
            abi: gameRoom.abi,
            eventName: "GameRoomParticipantLeft",
            fromBlock: deploymentBlock,
        });

        const leaveEvents = events.filter(
            (e: any) => e.args.participant?.toLowerCase() === accounts.participant1.address.toLowerCase()
        );
        assert.equal(leaveEvents.length, 1);
        assert.equal(leaveEvents[0].args.gameRoomName, "Event Leave Room");
    });
});

