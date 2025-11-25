import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import { setupContracts, getTestAccounts, mintTokens, approveTokens, getFutureTimestamp, Currency, SplitRule } from "../test/GameRoom.setup.js";
import { RoomStatus } from "../test/GameRoom.setup.js";


describe("GameRoom - Complete", async function () {
    it("Should complete room with TOP_1 split (100% to winner)", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 3n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant2);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = BigInt(Math.floor(Date.now() / 1000)) - 50n; // Past time

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "TOP_1 Complete Room",
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

        // Set scores: participant1 wins
        await gameRoom.write.updateScore([roomId, accounts.participant1.address, 1000n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant2.address, 500n], {
            account: accounts.creator,
        });

        const balanceBefore = await usdc.read.balanceOf([accounts.participant1.address]);
        await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });
        const balanceAfter = await usdc.read.balanceOf([accounts.participant1.address]);

        const totalPrize = entryFee * 3n; // 3 participants
        assert.equal(balanceAfter - balanceBefore, totalPrize);

        const room = await gameRoom.read.fetchGameRoomDetails([roomId]);
        assert.equal(Number(room[10]), RoomStatus.Completed); // status should be COMPLETED (3)
    });

    it("Should complete room with TOP_2 split (60/40)", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 4n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant2);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant3);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = BigInt(Math.floor(Date.now() / 1000)) - 50n;

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "TOP_2 Complete Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(5),
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
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant2 });
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant3 });
        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });

        // Set scores: participant1 and participant2 win
        await gameRoom.write.updateScore([roomId, accounts.participant1.address, 1000n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant2.address, 800n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant3.address, 500n], {
            account: accounts.creator,
        });

        const totalPrize = entryFee * 4n; // 4 participants
        const firstPrize = (totalPrize * 60n) / 100n;
        const secondPrize = totalPrize - firstPrize;

        const balance1Before = await usdc.read.balanceOf([accounts.participant1.address]);
        const balance2Before = await usdc.read.balanceOf([accounts.participant2.address]);

        await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });

        const balance1After = await usdc.read.balanceOf([accounts.participant1.address]);
        const balance2After = await usdc.read.balanceOf([accounts.participant2.address]);

        assert.equal(balance1After - balance1Before, firstPrize);
        assert.equal(balance2After - balance2Before, secondPrize);
    });

    it("Should complete room with TOP_3 split (50/30/20)", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee * 5n, accounts.creator);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant1);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant2);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant3);
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.participant4);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = BigInt(Math.floor(Date.now() / 1000)) - 50n;

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "TOP_3 Complete Room",
                    entryFee: entryFee,
                    maxPlayers: BigInt(5),
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
        await gameRoom.write.addToRoom([roomId], { account: accounts.participant3 });
        // Note: participant4 is same as participant3, so we skip it. We have creator + 3 participants = 4 total, which is enough for TOP_3
        await gameRoom.write.startGameRoom([roomId], { account: accounts.creator });

        // Set scores: participant1, participant2, participant3 win (creator has score 0)
        await gameRoom.write.updateScore([roomId, accounts.participant1.address, 1000n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant2.address, 800n], {
            account: accounts.creator,
        });
        await gameRoom.write.updateScore([roomId, accounts.participant3.address, 600n], {
            account: accounts.creator,
        });
        // Note: participant4 is same as participant3, so we don't update their score separately

        const totalPrize = entryFee * 4n; // 4 participants: creator + participant1 + participant2 + participant3
        const firstPrize = (totalPrize * 50n) / 100n;
        const secondPrize = (totalPrize * 30n) / 100n;
        const thirdPrize = totalPrize - firstPrize - secondPrize;

        const balance1Before = await usdc.read.balanceOf([accounts.participant1.address]);
        const balance2Before = await usdc.read.balanceOf([accounts.participant2.address]);
        const balance3Before = await usdc.read.balanceOf([accounts.participant3.address]);

        await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });

        const balance1After = await usdc.read.balanceOf([accounts.participant1.address]);
        const balance2After = await usdc.read.balanceOf([accounts.participant2.address]);
        const balance3After = await usdc.read.balanceOf([accounts.participant3.address]);

        assert.equal(balance1After - balance1Before, firstPrize);
        assert.equal(balance2After - balance2Before, secondPrize);
        assert.equal(balance3After - balance3Before, thirdPrize);
    });

    it("Should prevent non-creator from completing room", async function () {
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
                    name: "Unauthorized Complete Room",
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
                await gameRoom.write.completeGameRoom([roomId], { account: accounts.participant1 });
            },
            (error: any) => {
                return error.message.includes("Unauthorized") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent completing room that is not ACTIVE", async function () {
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
                    name: "Pending Complete Room",
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
                await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });
            },
            (error: any) => {
                return error.message.includes("GameRoomNotActive") || error.message.includes("revert");
            }
        );
    });

    it("Should prevent completing room before endTime", async function () {
        const { gameRoom, usdc } = await setupContracts();
        const accounts = await getTestAccounts();
        await mintTokens(usdc, null, accounts, parseEther("1000"));

        const entryFee = parseEther("100");
        await approveTokens(usdc, gameRoom.address, entryFee, accounts.creator);

        const startTime = BigInt(Math.floor(Date.now() / 1000)) - 100n;
        const endTime = getFutureTimestamp(3600); // Future time

        await gameRoom.write.createGameRoom(
            [
                {
                    name: "Future End Room",
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
                await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });
            },
            (error: any) => {
                return error.message.includes("InvalidTime") || error.message.includes("revert");
            }
        );
    });

    it("Should emit GameRoomCompleted event", async function () {
        const { gameRoom, usdc, publicClient } = await setupContracts();
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
                    name: "Event Complete Room",
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

        const deploymentBlock = await publicClient.getBlockNumber();

        await gameRoom.write.completeGameRoom([roomId], { account: accounts.creator });

        const events = await publicClient.getContractEvents({
            address: gameRoom.address,
            abi: gameRoom.abi,
            eventName: "GameRoomCompleted",
            fromBlock: deploymentBlock,
        });

        assert.equal(events.length, 1);
        assert.equal(events[0].args.name, "Event Complete Room");
    });
});

