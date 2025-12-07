// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IMiniBank.sol";

/// @title Attacker - Demonstrates reentrancy attack against MiniBank.withdraw
contract Attacker {
            IMiniBank public bank;
                        address public owner;

                                        // max number of recursive reentries to avoid infinite loops in demos
                                                            uint256 public maxReentry;
                                                                                    uint256 public reentryCount
                                                                                                                event Attackress indexed attacker, uint256 deposited);
                                                                                                                                                event Reentered(u)
}