// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;
// Child contract
// Import a smart contract
import "./Base.sol";
import "./library.sol";

contract FTLDToken is BaseToken {
    using Math for uint256;

    string public name;
    string public symbol;
    address public owner;
    uint256 public tax = 200;
    uint256 public constant initialSupply = 100 * (10**18);

    constructor(string memory _name, string memory _symbol) {
        owner = msg.sender;
        name = _name;
        symbol = _symbol;
        totalSupply  = initialSupply;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "You are not the owner of the token so you cannot mint it");
        _;
    }

    function mint(address to, uint256 amount) onlyOwner external override {
        uint256 toGet = amount.calculatePercentage(tax);
        uint256 netAmount = amount - toGet;
        _mint(to, netAmount);
        if (toGet > 0) {
            _mint(owner, toGet);
        }
    }

    function transfer(address from, address to, uint256 amount) external {
        _transfer(from, to, amount);
    }
}