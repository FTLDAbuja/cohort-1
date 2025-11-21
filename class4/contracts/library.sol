// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

library Math {
    /**
     * Calculating tax for token transfer
     * @param amount to calculate
     * @param bps basis point
     */
    function calculatePercentage(uint256 amount, uint256 bps) internal pure returns (uint256) {
        require(bps <= 1000, "BPS limit exceeded");
        return (amount * bps) / 10000;
    }
}