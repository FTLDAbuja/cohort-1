// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IMiniBank.sol";

/// @title SecureMiniBank - Safer implementation with reentrancy protection
contract SecureMiniBank is IMiniBank {
    address public owner;

    mapping(address => uint256) public balances;
    mapping(address => uint256[]) private depositHistory;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    // simple reentrancy guard
    bool private locked;

    modifier noReentrant() {
        require(!locked, "reentrant");
        locked = true;
        _;
        locked = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable override {
        require(msg.value > 0, "deposit > 0");
        balances[msg.sender] += msg.value;
        depositHistory[msg.sender].push(msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Safer withdraw: Checks -> Effects -> Interactions and non-reentrant
    function withdraw(uint256 amount) external override noReentrant {
        require(balances[msg.sender] >= amount, "insufficient balance");

        // ---- Checks done ----

        // ---- Effects: update storage BEFORE external call ----
        balances[msg.sender] -= amount;

        // ---- Interaction: external call last ----
        (bool success, ) = msg.sender.call{value: amount}("");
        // Note: always check the result of low-level calls
        require(success, "transfer failed");

        emit Withdraw(msg.sender, amount);
    }

    function getBalance(address user) external view override returns (uint256) {
        return balances[user];
    }

    function getDepositHistory(address user) external view override returns (uint256[] memory) {
        uint256 len = depositHistory[user].length;
        uint256[] memory copy = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            copy[i] = depositHistory[user][i];
        }
        return copy;
    }

    receive() external payable {
        // Accept ETH and record as deposit
        balances[msg.sender] += msg.value;
        depositHistory[msg.sender].push(msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    fallback() external payable {
        // Do nothing but accept the call for safety
    }

    function sweep() external onlyOwner {
        (bool sent, ) = payable(owner).call{value: address(this).balance}("");
        require(sent, "sweep failed");
    }
}
