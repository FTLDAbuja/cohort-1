# GameRoom Smart Contract

A decentralized game room smart contract built on Ethereum that allows users to create competitive game rooms, join with entry fees, and distribute prizes to winners based on customizable split rules.

[Like you are 12 years old](./LikeIAm12YearsOld.md)

## Table of Contents

- [Project Overview](#project-overview)
- [Smart Contract Documentation](#smart-contract-documentation)
- [Test Documentation](#test-documentation)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Usage Examples](#usage-examples)

## Project Overview

This project implements a game room smart contract that enables:

- **Room Creation**: Users can create game rooms with customizable parameters
- **Participant Management**: Players can join rooms by paying entry fees
- **Game Lifecycle**: Rooms progress through PENDING → ACTIVE → COMPLETED states
- **Score Tracking**: Room creators can update participant scores during active games
- **Prize Distribution**: Automatic winner determination and prize distribution based on split rules
- **Refund System**: Participants can leave or rooms can be cancelled with full refunds

### Key Features

- Support for USDC and USDT tokens
- Three winner split rules: TOP_1 (100%), TOP_2 (60/40), TOP_3 (50/30/20)
- Reentrancy protection using OpenZeppelin's ReentrancyGuard
- Access control ensuring only creators can manage their rooms
- Comprehensive event system for off-chain tracking

## Smart Contract Documentation

### Contract: `GameRoomContract`

The main contract that manages game rooms, participants, and prize distributions.

#### Enums

- **`Currency`**: Token type (USDC = 1, USDT = 0)
- **`WinnerSplitRule`**: Prize distribution rule
  - `TOP_1`: Winner takes 100% of prize pool
  - `TOP_2`: 1st place gets 60%, 2nd place gets 40%
  - `TOP_3`: 1st place gets 50%, 2nd place gets 30%, 3rd place gets 20%
- **`RoomStatus`**: Room state
  - `ACTIVE`: Game is in progress
  - `PENDING`: Room created, waiting to start
  - `CANCELLED`: Room was cancelled, participants refunded
  - `COMPLETED`: Game finished, winners paid

#### Structs

**`GameRoom`**

- `name`: Room name
- `id`: Unique room identifier
- `entryFee`: Required entry fee amount
- `maxPlayers`: Maximum participants allowed
- `startTime`: Unix timestamp when game can start
- `endTime`: Unix timestamp when game can be completed
- `totalPrizePool`: Accumulated entry fees
- `createdAt`: Room creation timestamp
- `activePlayersCount`: Current number of participants
- `currency`: Token type (USDC/USDT)
- `winnerSplitRule`: Prize distribution rule
- `status`: Current room status
- `creator`: Address of room creator
- `participantList`: Array of participant addresses
- `participants`: Mapping of address to participant data
- `participantIndex`: Mapping of address to list index

**`RoomCreationParams`**

- Parameters required to create a new room

**`GameRoomParticipant`**

- `entryFee`: Amount paid to join
- `score`: Current game score
- `participantAddress`: Participant's wallet address
- `isWinner`: Whether participant won prizes

#### Public Functions

##### `createGameRoom(RoomCreationParams memory params) → uint256`

Creates a new game room. The creator is automatically added as the first participant.

**Parameters:**

- `params.name`: Room name
- `params.entryFee`: Entry fee in token units
- `params.maxPlayers`: Maximum players allowed
- `params.startTime`: Unix timestamp for game start
- `params.endTime`: Unix timestamp for game completion
- `params.splitRule`: WinnerSplitRule enum value
- `params.currency`: Currency enum value (USDC/USDT)

**Returns:** Room ID

**Events:** `GameRoomCreated`

**Requirements:**

- Caller must approve token spending before calling
- Entry fee is automatically collected from creator

##### `fetchGameRoomDetails(uint256 _id) → (tuple)`

Retrieves all details of a specific game room.

**Parameters:**

- `_id`: Room ID

**Returns:** Tuple containing all room details (id, entryFee, maxPlayers, startTime, endTime, totalPrizePool, createdAt, activePlayersCount, currency, winnerSplitRule, status, creator, participantList)

##### `addToRoom(uint256 _id) → GameRoomParticipant`

Allows a participant to join an existing game room.

**Parameters:**

- `_id`: Room ID to join

**Returns:** Participant struct

**Events:** `GameRoomJoined`

**Requirements:**

- Room must be in PENDING status
- Room must not be at max capacity
- Participant must not already be in the room
- Caller must approve token spending

**Errors:**

- `GameRoomNotPending`: Room is not in PENDING status
- `MaxPlayersReached`: Room is at capacity
- `ParticipantAlreadyInRoom`: Participant already joined

##### `startGameRoom(uint256 _id)`

Starts a game room, changing status from PENDING to ACTIVE.

**Parameters:**

- `_id`: Room ID to start

**Events:** `GameRoomStarted`

**Requirements:**

- Only room creator can call
- Room must be in PENDING status
- Current time must be >= startTime

**Errors:**

- `Unauthorized`: Caller is not the room creator
- `GameRoomNotPending`: Room is not in PENDING status
- `InvalidTime`: Current time is before startTime

##### `cancelGameRoom(uint256 _id)`

Cancels a game room and refunds all participants.

**Parameters:**

- `_id`: Room ID to cancel

**Events:** `GameRoomCancelled`

**Requirements:**

- Only room creator can call
- Room must be in PENDING status

**Errors:**

- `Unauthorized`: Caller is not the room creator
- `GameRoomNotPending`: Room is not in PENDING status

##### `leaveGameRoom(uint256 _id)`

Allows a participant to leave a game room and receive a refund.

**Parameters:**

- `_id`: Room ID to leave

**Events:** `GameRoomParticipantLeft`

**Requirements:**

- Room must be in PENDING status
- Caller must be a participant in the room

**Errors:**

- `GameRoomNotPending`: Room is not in PENDING status
- `ParticipantNotInRoom`: Caller is not a participant

##### `updateScore(uint256 _id, address participant, uint256 score)`

Updates a participant's score in an active game room.

**Parameters:**

- `_id`: Room ID
- `participant`: Address of participant
- `score`: New score value

**Requirements:**

- Only room creator can call
- Room must be in ACTIVE status
- Participant must be in the room

**Errors:**

- `Unauthorized`: Caller is not the room creator
- `GameRoomNotActive`: Room is not in ACTIVE status
- `ParticipantNotInRoom`: Participant is not in the room

##### `completeGameRoom(uint256 _id)`

Completes a game room, determines winners, and distributes prizes.

**Parameters:**

- `_id`: Room ID to complete

**Events:** `GameRoomCompleted`

**Requirements:**

- Only room creator can call
- Room must be in ACTIVE status
- Current time must be >= endTime

**Errors:**

- `Unauthorized`: Caller is not the room creator
- `GameRoomNotActive`: Room is not in ACTIVE status
- `InvalidTime`: Current time is before endTime

#### Events

- `GameRoomCreated(address indexed creator, uint256 entryFee)`: Emitted when a room is created
- `GameRoomJoined(address indexed participant, string gameRoomName, uint256 entryFee, uint256 entryTime)`: Emitted when a participant joins
- `GameRoomParticipantLeft(address indexed participant, string gameRoomName, uint256 timeLeft)`: Emitted when a participant leaves
- `GameRoomStarted(string name, uint256 timeStarted)`: Emitted when a room starts
- `GameRoomCancelled(string name, uint256 timeCancelled)`: Emitted when a room is cancelled
- `GameRoomCompleted(string name, uint256 timeCompleted)`: Emitted when a room is completed

#### Custom Errors

- `GameRoomNotStarted()`: Room has not been started
- `GameRoomNotPending()`: Room is not in PENDING status
- `ParticipantNotInRoom()`: Participant is not in the room
- `GameRoomNotActive()`: Room is not in ACTIVE status
- `Unauthorized()`: Caller is not authorized for this action
- `GameRoomAlreadyStarted()`: Room has already been started
- `GameRoomAlreadyCompleted()`: Room has already been completed
- `InvalidTime()`: Invalid timestamp for this operation
- `NoParticipants()`: Room has no participants
- `MaxPlayersReached()`: Room has reached maximum capacity
- `ParticipantAlreadyInRoom()`: Participant is already in the room

## Test Documentation

The test suite is organized into multiple files for better maintainability:

### Test Files

#### `test/GameRoom.setup.ts`

Shared test utilities and setup functions:

- `setupContracts()`: Deploys USDC, USDT, and GameRoomContract
- `getTestAccounts()`: Returns test account addresses
- `mintTokens()`: Mints tokens to test accounts
- `approveTokens()`: Approves token spending
- `getFutureTimestamp()`: Helper for creating future timestamps

#### `test/GameRoom.create.test.ts`

Tests for room creation:

- Creating rooms with USDC
- Creating rooms with USDT
- Creating rooms with different split rules (TOP_1, TOP_2, TOP_3)
- Event emission verification

#### `test/GameRoom.join.test.ts`

Tests for participant joining:

- Successful room joining
- Preventing joins when room is not PENDING
- Preventing joins when max players reached
- Preventing duplicate joins
- Event emission verification

#### `test/GameRoom.start.test.ts`

Tests for starting game rooms:

- Successful room start by creator
- Preventing non-creator from starting
- Preventing start when room is not PENDING
- Preventing start before startTime
- Event emission verification

#### `test/GameRoom.cancel.test.ts`

Tests for room cancellation:

- Successful cancellation with refunds
- Preventing non-creator from cancelling
- Preventing cancellation when room is not PENDING
- Event emission verification

#### `test/GameRoom.leave.test.ts`

Tests for participants leaving:

- Successful leave with refund
- Preventing leave when room is not PENDING
- Preventing non-participants from leaving
- Event emission verification

#### `test/GameRoom.score.test.ts`

Tests for score updates:

- Successful score update by creator
- Preventing non-creator from updating scores
- Preventing updates when room is not ACTIVE
- Preventing updates for non-participants

#### `test/GameRoom.complete.test.ts`

Tests for room completion and prize distribution:

- TOP_1 split: Single winner takes 100%
- TOP_2 split: Winners split 60/40
- TOP_3 split: Winners split 50/30/20
- Preventing non-creator from completing
- Preventing completion when room is not ACTIVE
- Preventing completion before endTime
- Event emission verification

#### `test/GameRoom.access.test.ts`

Tests for access control:

- Only creator can start rooms
- Only creator can cancel rooms
- Only creator can complete rooms
- Only creator can update scores

#### `test/GameRoom.edge.test.ts`

Tests for edge cases:

- Room with only creator (no other participants)
- Tied scores handling
- TOP_2 with only 1 participant
- TOP_3 with only 2 participants
- Multiple rooms simultaneously

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install
```

### Run All Tests

```bash
# Run all tests
pnpm test

# Or using hardhat directly
npx hardhat test
```

### Run Specific Test Files

```bash
# Run only creation tests
npx hardhat test test/GameRoom.create.test.ts

# Run only completion tests
npx hardhat test test/GameRoom.complete.test.ts

# Run only access control tests
npx hardhat test test/GameRoom.access.test.ts
```

### Run Tests with Verbose Output

```bash
npx hardhat test --verbose
```

### Test Coverage

The test suite covers:

- ✅ All public functions
- ✅ Access control mechanisms
- ✅ Error conditions
- ✅ Event emissions
- ✅ Edge cases
- ✅ Prize distribution logic for all split rules
- ✅ Refund mechanisms

## Deployment

### Prerequisites

1. **Node.js** and **pnpm** installed
2. **Hardhat** configured (already set up)
3. **Private key** for deployment account
4. **RPC URL** for the target network

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Configure Network

The project supports multiple networks. Configure your deployment network in `hardhat.config.ts`:

- **Sepolia**: Testnet
- **Lisk Sepolia**: Lisk testnet
- **Base Sepolia**: Base testnet
- **Local**: Hardhat local network

### Step 3: Set Environment Variables

Set your deployment private key using Hardhat's keystore:

```bash
# Set private key for deployment
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
```

Or set as environment variable:

```bash
export DEPLOYER_PRIVATE_KEY=your_private_key_here
```

For Sepolia:

```bash
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

### Step 4: Deploy Contracts

#### Deploy to Local Network

```bash
# Start local Hardhat node (in separate terminal)
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.ts
```

#### Deploy to Sepolia Testnet

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

#### Deploy to Lisk Sepolia

```bash
npx hardhat run scripts/deploy.ts --network liskSepolia
```

#### Deploy to Base Sepolia

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

### Step 5: Verify Deployment

The deployment script will output:

```
=== Deployment Summary ===
USDC Address: 0x...
USDT Address: 0x...
GameRoomContract Address: 0x...
Deployer Address: 0x...
```

### Step 6: Fund Deployment Account

Ensure your deployment account has:

- **ETH** for gas fees
- **USDC/USDT tokens** (if you want to mint test tokens)

The deployment script automatically mints 100,000 tokens to the deployer for testing.

### Deployment Script Details

The `scripts/deploy.ts` script:

1. Deploys USDC token contract
2. Deploys USDT token contract
3. Deploys GameRoomContract with USDC and USDT addresses
4. Mints 100,000 USDC and USDT to deployer for testing
5. Outputs all contract addresses

### Post-Deployment

After deployment, you can:

1. **Verify contracts** on block explorers (Etherscan, etc.)
2. **Interact with contracts** using Hardhat console or frontend
3. **Test functionality** using the deployed addresses

## Usage Examples

### Creating a Game Room

```javascript
const roomParams = {
  name: "My Game Room",
  entryFee: parseEther("100"), // 100 tokens
  maxPlayers: 4,
  startTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  endTime: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
  splitRule: 0, // TOP_1
  currency: 1, // USDC
};

// Approve tokens first
await usdc.approve(gameRoom.address, parseEther("100"));

// Create room
const tx = await gameRoom.createGameRoom(roomParams);
const receipt = await tx.wait();
const roomId = receipt.events[0].args.roomId;
```

### Joining a Room

```javascript
// Approve entry fee
await usdc.approve(gameRoom.address, parseEther("100"));

// Join room
await gameRoom.addToRoom(roomId);
```

### Starting a Game

```javascript
// Only creator can start
await gameRoom.startGameRoom(roomId);
```

### Updating Scores

```javascript
// Only creator can update scores
await gameRoom.updateScore(roomId, participantAddress, 1000);
```

### Completing a Game

```javascript
// Only creator can complete
// Automatically determines winners and distributes prizes
await gameRoom.completeGameRoom(roomId);
```

## Security Features

- **Reentrancy Protection**: All state-changing functions use `nonReentrant` modifier
- **Access Control**: Only room creators can manage their rooms
- **Input Validation**: Comprehensive checks for all function parameters
- **Safe Token Transfers**: Uses OpenZeppelin's IERC20 interface
- **Ownable**: Contract owner can manage contract-level settings

## License

SEE LICENSE IN LICENSE

## Contributing

This is a learning project. Feel free to fork and improve!
