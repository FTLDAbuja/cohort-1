// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IMiniBank - Minimal interface for MiniBank used by external contracts
interface IMiniBank {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function getBalance(address user) external view returns (uint256);
    function getDepositHistory(address user) external view returns (uint256[] memory);
}
