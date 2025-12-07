// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IMiniBank.sol";

/// @title MiniBank - Educational vulnerable bank contract
/// @notice Intentionally contains a reentrancy vulnerability for teaching purposes.
contract MiniBank is IMiniBank {
    address public owner;

    // balances stored in contract storage
    mapping(address => uint256) public balances;

    // deposit history stored in storage mapping -> dynamic storage arrays
    mapping(address => uint256[]) private depositHistory;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event FallbackCalled(address indexed from, uint256 value, bytes data);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice deposit into the bank. Demonstrates calldata/memory vs storage when reading inputs.
    function deposit() external payable override {
        require(msg.value > 0, "deposit > 0");

        // update storage mapping
        balances[msg.sender] += msg.value;

        // push to deposit history (storage)
        depositHistory[msg.sender].push(msg.value);

        emit Deposit(msg.sender, msg.value);
    }

    /// @notice vulnerable withdraw that does external call BEFORE updating storage (vulnerable to reentrancy)
    /// @dev This intentionally does the external call first to demonstrate the vulnerability.
    function withdraw(uint256 amount) external override {
        require(balances[msg.sender] >= amount, "insufficient balance");

        // Vulnerable pattern: external interaction before updating internal state
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");

        // state update happens AFTER external call -> reentrancy possible
        balances[msg.sender] -= amount;

        emit Withdraw(msg.sender, amount);
    }

    /// @notice returns user's balance (example of view function reading storage)
    function getBalance(address user) external view override returns (uint256) {
        return balances[user];
    }

    /// @notice Return deposit history as memory array (teaches converting storage -> memory for returns)
    function getDepositHistory(address user) external view override returns (uint256[] memory) {
        uint256 len = depositHistory[user].length;
        uint256[] memory copy = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            copy[i] = depositHistory[user][i]; // reading storage, writing to memory
        }
        return copy;
    }

    /// @notice receive to accept plain ETH transfers (teaches receive)
    receive() external payable {
        // treat direct ETH as a deposit for convenience
        balances[msg.sender] += msg.value;
        depositHistory[msg.sender].push(msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice fallback to handle unknown calls and log calldata (teaches fallback and calldata)
    fallback() external payable {
        emit FallbackCalled(msg.sender, msg.value, msg.data);
    }

    /// @notice helper for tests/demos: withdraw contract balance to owner
    function sweep() external onlyOwner {
        (bool sent, ) = payable(owner).call{value: address(this).balance}("");
        require(sent, "sweep failed");
    }
}
