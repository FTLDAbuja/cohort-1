MiniBank

Overview

The MiniBank system contains three contracts — MiniBank, Beneficiary, and ExternalMathLib.
They demonstrate interfaces, data-location rules, low-level calls, fallback/receive logic, and inter-contract communication.


---

1. MiniBank.sol – Line-by-Line Explanation

Pragma + Imports

pragma solidity ^0.8.24;
import "./IMiniBank.sol";

Two directives define compiler version and import the interface so the bank contract formally implements required functions.
This teaches interfaces and strict type expectations for external callers.


---

State Variables

mapping(address => uint256) private balances;
address public owner;

balances is a mapping stored in storage so deposits permanently change blockchain state.
owner tracks the administrator and demonstrates persistent state access.


---

Events

event Deposit(address indexed user, uint256 amount);
event Withdrawal(address indexed user, uint256 amount);
event LowLevelCallSuccess(bool success, bytes data);

Events record deposits/withdrawals and expose low-level call debugging.
Students learn indexed topics and ABI-encoded return data.


---

Constructor

constructor() {
    owner = msg.sender;
}

The deployer becomes the bank owner.
This demonstrates initialization of storage variables.


---

Deposit Function

function deposit() external payable override {
    balances[msg.sender] += msg.value;
    emit Deposit(msg.sender, msg.value);
}

msg.value shows ETH transfer and memory vs storage understanding, since mapping writes always hit storage.
The emitted event confirms the transaction effect.


---

Withdraw Function

function withdraw(uint256 amount) external override {
    require(balances[msg.sender] >= amount, "Insufficient funds");

    balances[msg.sender] -= amount;
    payable(msg.sender).transfer(amount);

    emit Withdrawal(msg.sender, amount);
}

The function demonstrates transfer, state updates, and checks-effects-interactions.
It contrasts high-level ETH sending with low-level call.


---

Getter

function getBalance(address user) external view returns (uint256) {
    return balances[user];
}

A simple view function teaches view semantics and external visibility.
No storage modifications occur.


---

Low-Level Call Example

function tryExternalMath(address target, uint256 x) external {
    (bool success, bytes memory data) = target.call(
        abi.encodeWithSignature("double(uint256)", x)
    );
    emit LowLevelCallSuccess(success, data);
}

This teaches call(), manual ABI encoding, and why return data is untyped bytes.
Students learn how failures do not automatically revert.


---

Fallback + Receive

fallback() external payable {}
receive() external payable {}

receive handles plain ETH transfers, while fallback handles unknown function calls.
This teaches the dispatch order: receive → fallback.


---

2. Beneficiary.sol – Line-by-Line Explanation

State Variables

address public lastSender;
uint256 public lastValue;

These store who invoked the contract and how much ETH was attached.
It allows students to see how external calls modify state.


---

Function Called by the Bank

function ping() external {
    lastSender = msg.sender;
}

This teaches simple inter-contract communication.
Students compare msg.sender under normal calls vs delegatecall.


---

Receive

receive() external payable {
    lastValue = msg.value;
}

This logs ETH received directly.
Students observe that other contracts can trigger it.


---

3. ExternalMathLib.sol – Line-by-Line Explanation

function double(uint256 x) external pure returns (uint256) {
    return x * 2;
}

A pure function used only to demonstrate low-level ABI encoding.
Students learn how external pure functions are invoked via call.


---

4. IMiniBank.sol – Line-by-Line Explanation

interface IMiniBank {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

Defines the public surface area the bank must implement.
Teaches that interfaces contain no logic and are used for abstraction.


---

5. Project Structure

contracts/
 ├── MiniBank.sol
 └── IMiniBank.sol
test/
 └── minibank.test.ts

---

6. What This Project Teaches

1. Interfaces

MiniBank implements IMiniBank, showing how contracts standardize APIs.
Students see how external callers rely on strict function signatures.

2. Storage vs Memory vs Calldata

Mappings in storage, calldata arguments, and memory ABI buffers appear across the project.
This teaches state persistence vs transient data.

3. Low-Level Calls

The .call() example shows manual ABI encoding and raw return bytes.
Students understand why delegatecall and staticcall differ.

4. Fallback & Receive

MiniBank and Beneficiary show how ETH dispatch works.
Tests will prove which function runs under each scenario.
