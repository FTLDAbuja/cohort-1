import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import { setupContracts, getTestAccounts, mintTokens, approveTokens, getFutureTimestamp, Currency, SplitRule } from "../test/GameRoom.setup.js";
import { RoomStatus } from "../test/GameRoom.setup.js";

describe("GameRoom - Cancel", async function () {
    it("Should cancel room and refund all participants", async function () {
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
                    name: "Cancel Test Room",
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
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant2 });

        const balanceBefore1 = await usdc.read.balanceOf([accounts.participant1.address]);
        const balanceBefore2 = await usdc.read.balanceOf([accounts.participant2.address]);

        await gameRoom.write.cancelGameRoom([roomId], { account: accounts.creator });

        const balanceAfter1 = await usdc.read.balanceOf([accounts.participant1.address]);
        const balanceAfter2 = await usdc.read.balanceOf([accounts.participant2.address]);

        assert.equal(balanceAfter1 - balanceBefore1, entryFee);
        assert.equal(balanceAfter2 - balanceBefore2, entryFee);

        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(Number(room[10]), RoomStatus.Cancelled); // status should be CANCELLED (2)
    });

    it("Should prevent non-creator from cancelling room", async function () {
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
                    name: "Unauthorized Cancel Room",
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
                await gameRoom.write.cancelGameRoom([roomId], { account: accounts.participant1 });
            },
            (error: any) => {
                return error.message.includes("Unauthorized") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent cancelling room that is not PENDING", async function () {
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
                    name: "Started Cancel Room",
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
                await gameRoom.write.cancelGameRoom([roomId], { account: accounts.creator });
            },
            (error: any) => {
                return error.message.includes("GameRoomNotPending") || error.message.includes("revert");
            }
        );
    });

    it("Should emit GameRoomCancelled event", async function () {
        const { gameRoom, usdc, publicClient } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = getFutureTimestamp(3600);
        const endTime = getFutureTimestamp(7200);

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Event Cancel Room",
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

        await gameRoom.write.cancelGameRoom([roomId], { account: accounts.creator });

        const events = await publicClient.getContractEvents({
            address: gameRoom.address,
            abi: gameRoom.abi,
            eventName: "GameRoomCancelled",
            fromBlock: deploymentBlock,
        });

        assert.equal(events.length, 1);
        assert.equal(events[0].args.name, "Event Cancel Room");
    });
});

