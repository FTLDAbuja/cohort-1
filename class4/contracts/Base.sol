// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

// Inheritances, libraries, abstract contracts, , 


abstract contract BaseToken {
    mapping (address => uint256) private _balances;
    uint256 public totalSupply;

    // balanceOf - It gets the token balance for an address
    // transfer - transfer the token
    // mint - minting the token for an address
    // burn function

    event TokenTransferred(address indexed from, address indexed to, uint256 amount);
    event TokenMinted(address indexed to, uint256 amount);

    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    // address(0) => 0x0
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "This address is a zero address"); 
        require(to != address(0), "This address is a zero address");

        // If from balance is less than the amount he wants to send, revert
        require(_balances[from] >= amount, "Insufficient funds");
        _balances[from] -= amount;
        _balances[to] += amount;
        emit TokenTransferred(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal virtual {
        require(totalSupply > amount, "Supply is no longer enough");
        totalSupply -= amount;
        _balances[to] += amount;
        emit TokenMinted(to, amount);
    }

    function mint(address to, uint256 amount) external virtual;

}