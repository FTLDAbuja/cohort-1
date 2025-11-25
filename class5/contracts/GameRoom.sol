// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract GameRoomContract is Ownable, ReentrancyGuard  {
    // Using SafeERC20 for IERC20 to prevent reentrancy attacks
    using SafeERC20 for IERC20;
    enum Currency {
        USDC, USDT
    }
    enum WinnerSplitRule {
        TOP_1, TOP_2, TOP_3
    }
    enum RoomStatus {
        ACTIVE, PENDING, CANCELLED, COMPLETED
    }

     /**
     * @dev Represents a single game room.
     */
    struct GameRoom {
        string name;
        
        // Integers
        uint256 id; // Room ID, replaces Sui's UID
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 startTime; // Planned start time (Unix timestamp)
        uint256 endTime; // Planned end time (Unix timestamp)
        uint256 totalPrizePool;
        uint256 createdAt;
        uint256 activePlayersCount;

        // Enums
        Currency currency; // Address of the ERC20 token (USDC/USDT), replaces `currency: String`
        WinnerSplitRule winnerSplitRule; // Consider encoding this (e.g., uint8) for efficiency
        RoomStatus status; // Uses enum instead of string

        // Addresses
        address creator;
        address[] participantList; // Replaces participant_vector for iteration

        // Mappings
        mapping(address => GameRoomParticipant) participants; // Replaces `participants: Table` for O(1) lookup
        mapping(address => uint256) participantIndex;
    }

    struct RoomCreationParams {
        string name;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 startTime;
        uint256 endTime;
        WinnerSplitRule splitRule;
        Currency currency;
    }

    struct GameRoomParticipant {
        uint256 entryFee;
        uint256 score;
        address participantAddress;
        bool isWinner;
    }

    // Events
    event GameRoomCreated(address indexed creator, uint256 entryFee);
    event GameRoomJoined(address indexed participant, string gameRoomName, uint256 entryFee, uint256 entryTime);
    event GameRoomParticipantLeft(address indexed participant, string gameRoomName, uint256 timeLeft);
    event GameRoomStarted(string name, uint256 timeStarted);
    event GameRoomCancelled(string name, uint256 timeCancelled);
    event GameRoomCompleted(string name, uint256 timeCompleted);


    // Errors
    error GameRoomNotStarted();
    error GameRoomNotPending();
    error ParticipantNotInRoom();
    error GameRoomNotActive();
    error Unauthorized();
    error GameRoomAlreadyStarted();
    error GameRoomAlreadyCompleted();
    error InvalidTime();
    error NoParticipants();
    error MaxPlayersReached();
    error ParticipantAlreadyInRoom();
    error IncompleteWinners();

    // State variables
    IERC20 private usdt;
    IERC20 private usdc;
    uint256 public roomCounter;

    mapping(uint256 => GameRoom) public gameRooms;

    /**
     * @notice Initializes the GameRoomContract with USDT and USDC token addresses
     * @param _usdt Address of the USDT ERC20 token contract
     * @param _usdc Address of the USDC ERC20 token contract
     * @dev Sets the deployer as the contract owner and initializes roomCounter to 1
     */
    constructor(address _usdt, address _usdc) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
        usdc = IERC20(_usdc);
        roomCounter = 1;
    }

    /**
     * @dev Internal helper function to transfer tokens from a user to the contract
     * @param currency The currency type (USDT or USDC)
     * @param from The address to transfer tokens from
     * @param amount The amount of tokens to transfer
     */
    function getToken(Currency currency, address from, uint256 amount) private {
        if (currency == Currency.USDT) {
            usdt.safeTransferFrom(from, address(this), amount);
        } else {
            usdc.safeTransferFrom(from, address(this), amount);
        }
    }

    /**
     * @dev Internal helper function to transfer tokens from the contract to a user
     * @param currency The currency type (USDT or USDC)
     * @param to The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     */
    function sendToken(Currency currency, address to, uint256 amount) private {
        if (currency == Currency.USDT) {
            usdt.safeTransfer(to, amount);
        } else {
            usdc.safeTransfer(to, amount);
        }
    }

    /**
     * @notice Creates a new game room with the specified parameters
     * @dev The creator is automatically added as the first participant and their entry fee is collected
     * @param params RoomCreationParams struct containing:
     *   - name: Name of the game room
     *   - entryFee: Entry fee required to join (in wei/token units)
     *   - maxPlayers: Maximum number of players allowed
     *   - startTime: Unix timestamp when the game can start
     *   - endTime: Unix timestamp when the game can be completed
     *   - splitRule: WinnerSplitRule enum (TOP_1, TOP_2, or TOP_3)
     *   - currency: Currency enum (USDC or USDT)
     * @return The room ID of the newly created game room
     * @custom:security Uses nonReentrant modifier to prevent reentrancy attacks
     */
    function createGameRoom(RoomCreationParams memory params) external nonReentrant returns (uint256) {
        address creator = msg.sender;
        // We want to add the creator of the game room to the room automatically

        // Create a participant
        GameRoomParticipant memory participant = GameRoomParticipant({
            entryFee: params.entryFee,
            score: 0,
            participantAddress: creator,
            isWinner: false
        });

        getToken(params.currency, creator, params.entryFee);
        GameRoom storage gameRoom = gameRooms[roomCounter];
        gameRoom.id = roomCounter;
        gameRoom.name = params.name;
        gameRoom.entryFee = params.entryFee;
        gameRoom.maxPlayers = params.maxPlayers;
        gameRoom.startTime = params.startTime;
        gameRoom.endTime = params.endTime;
        gameRoom.totalPrizePool = params.entryFee;
        gameRoom.activePlayersCount = 1;
        gameRoom.createdAt = block.timestamp;
        gameRoom.currency = params.currency;
        gameRoom.winnerSplitRule = params.splitRule;
        gameRoom.status = RoomStatus.PENDING;
        gameRoom.creator = creator;
        gameRoom.participantList.push(creator);
        gameRoom.participantIndex[creator] = 0;
        gameRoom.participants[creator] = participant;
        
        roomCounter++;
        emit GameRoomCreated(creator, params.entryFee);
        return roomCounter - 1;
    }

    /**
     * @notice Retrieves all details of a specific game room
     * @param _id The room ID to fetch details for
     * @return id The room ID
     * @return entryFee The entry fee for the room
     * @return maxPlayers Maximum number of players allowed
     * @return startTime Unix timestamp when the game can start
     * @return endTime Unix timestamp when the game can be completed
     * @return totalPrizePool Total prize pool accumulated from entry fees
     * @return createdAt Unix timestamp when the room was created
     * @return activePlayersCount Current number of active participants
     * @return currency Currency type (0 = USDT, 1 = USDC)
     * @return winnerSplitRule Winner split rule (0 = TOP_1, 1 = TOP_2, 2 = TOP_3)
     * @return status Room status (0 = ACTIVE, 1 = PENDING, 2 = CANCELLED, 3 = COMPLETED)
     * @return creator Address of the room creator
     * @return participantList Array of all participant addresses
     */
    function fetchGameRoomDetails(uint256 _id) external view returns (
        uint256 id, // Room ID, replaces Sui's UID
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 startTime, // Planned start time (Unix timestamp)
        uint256 endTime, // Planned end time (Unix timestamp)
        uint256 totalPrizePool,
        uint256 createdAt,
        uint256 activePlayersCount,

        // Enums
        Currency currency, // Address of the ERC20 token (USDC/USDT), replaces `currency: String`
        WinnerSplitRule winnerSplitRule, // Consider encoding this (e.g., uint8) for efficiency
        RoomStatus status, // Uses enum instead of string

        // Addresses
        address creator,
        address[] memory participantList
    ) {
        GameRoom storage gameRoom = gameRooms[_id];
        return (
            gameRoom.id, // Room ID, replaces Sui's UID
        gameRoom.entryFee,
        gameRoom.maxPlayers,
        gameRoom.startTime, // Planned start time (Unix timestamp)
        gameRoom.endTime, // Planned end time (Unix timestamp)
        gameRoom.totalPrizePool,
        gameRoom.createdAt,
        gameRoom.activePlayersCount,

        // Enums
        gameRoom.currency, // Address of the ERC20 token (USDC/USDT), replaces `currency: String`
        gameRoom.winnerSplitRule, // Consider encoding this (e.g., uint8) for efficiency
        gameRoom.status, // Uses enum instead of string

        // Addresses
        gameRoom.creator,
        gameRoom.participantList // Replaces participant_vector for iteration
        );   
    }

    /**
     * @notice Allows a participant to join an existing game room
     * @dev Transfers entry fee from participant to contract and adds them to the room
     * @param _id The room ID to join
     * @return The GameRoomParticipant struct for the newly added participant
     * @custom:error GameRoomNotPending if room is not in PENDING status
     * @custom:error MaxPlayersReached if room has reached maximum capacity
     * @custom:error ParticipantAlreadyInRoom if participant is already in the room
     * @custom:security Uses nonReentrant modifier to prevent reentrancy attacks
     */
    function addToRoom(uint256 _id) external nonReentrant returns (GameRoomParticipant memory) {
        GameRoom storage room = gameRooms[_id];
        if (room.status != RoomStatus.PENDING) revert GameRoomNotPending();
        if (room.activePlayersCount >= room.maxPlayers) revert MaxPlayersReached();
        if (room.participants[msg.sender].participantAddress != address(0)) revert ParticipantAlreadyInRoom();
        
        getToken(room.currency, msg.sender, room.entryFee);
        GameRoomParticipant memory participant = GameRoomParticipant({
            entryFee: room.entryFee,
            score: 0,
            participantAddress: msg.sender,
            isWinner: false
        });
        uint256 currentParticipantIndex = room.participantList.length;
        room.activePlayersCount += 1;
        room.totalPrizePool += room.entryFee;
        room.participantList.push(msg.sender);
        room.participantIndex[msg.sender] = currentParticipantIndex;
        room.participants[msg.sender] = participant;

        emit GameRoomJoined(msg.sender, room.name, room.entryFee, block.timestamp);
        return participant;
    }

    /**
     * @notice Starts a game room, changing its status from PENDING to ACTIVE
     * @dev Only the room creator can start the room. The current time must be >= startTime
     * @param _id The room ID to start
     * @custom:error Unauthorized if caller is not the room creator
     * @custom:error GameRoomNotPending if room is not in PENDING status
     * @custom:error InvalidTime if current time is before the room's startTime
     * @custom:event Emits GameRoomStarted event upon successful start
     */
    function startGameRoom(uint256 _id) external {
        GameRoom storage room = gameRooms[_id];
        if (room.creator != msg.sender) revert Unauthorized();
        if (room.status != RoomStatus.PENDING) revert GameRoomNotPending();
        if (block.timestamp < room.startTime) revert InvalidTime();
        
        room.status = RoomStatus.ACTIVE;
        emit GameRoomStarted(room.name, block.timestamp);
    }

    /**
     * @notice Cancels a game room and refunds all participants their entry fees
     * @dev Only the room creator can cancel. All participants receive full refunds
     * @param _id The room ID to cancel
     * @custom:error Unauthorized if caller is not the room creator
     * @custom:error GameRoomNotPending if room is not in PENDING status
     * @custom:security Uses nonReentrant modifier to prevent reentrancy attacks
     * @custom:event Emits GameRoomCancelled event upon successful cancellation
     */
    function cancelGameRoom(uint256 _id) external nonReentrant {
        GameRoom storage room = gameRooms[_id];
        if (room.creator != msg.sender) revert Unauthorized();
        if (room.status != RoomStatus.PENDING) revert GameRoomNotPending();
        
        // Refund all participants
        for (uint256 i = 0; i < room.participantList.length; i++) {
            address participant = room.participantList[i];
            GameRoomParticipant storage p = room.participants[participant];
            if (p.participantAddress != address(0)) {
                sendToken(room.currency, participant, p.entryFee);
            }
        }
        
        room.status = RoomStatus.CANCELLED;
        emit GameRoomCancelled(room.name, block.timestamp);
    }

    /**
     * @notice Allows a participant to leave a game room and receive a refund
     * @dev Only works when room is in PENDING status. Participant receives full entry fee refund
     * @param _id The room ID to leave
     * @custom:error GameRoomNotPending if room is not in PENDING status
     * @custom:error ParticipantNotInRoom if caller is not a participant in the room
     * @custom:security Uses nonReentrant modifier to prevent reentrancy attacks
     * @custom:event Emits GameRoomParticipantLeft event when participant leaves
     */
    function leaveGameRoom(uint256 _id) external nonReentrant {
        GameRoom storage room = gameRooms[_id];
        if (room.status != RoomStatus.PENDING) revert GameRoomNotPending();
        if (room.participants[msg.sender].participantAddress == address(0)) revert ParticipantNotInRoom();
        
        GameRoomParticipant storage participant = room.participants[msg.sender];
        
        // Refund entry fee
        sendToken(room.currency, msg.sender, participant.entryFee);
        
        // Remove from participantList
        uint256 index = room.participantIndex[msg.sender];
        uint256 lastIndex = room.participantList.length - 1;
        if (index != lastIndex) {
            address lastParticipant = room.participantList[lastIndex];
            room.participantList[index] = lastParticipant;
            room.participantIndex[lastParticipant] = index;
        }
        room.participantList.pop();
        
        // Update state
        room.activePlayersCount -= 1;
        room.totalPrizePool -= participant.entryFee;
        delete room.participants[msg.sender];
        delete room.participantIndex[msg.sender];
        
        emit GameRoomParticipantLeft(msg.sender, room.name, block.timestamp);
    }

    /**
     * @notice Updates a participant's score in an active game room
     * @dev Only the room creator can update scores. Room must be in ACTIVE status
     * @param _id The room ID
     * @param participant The address of the participant whose score to update
     * @param score The new score value
     * @custom:error Unauthorized if caller is not the room creator
     * @custom:error GameRoomNotActive if room is not in ACTIVE status
     * @custom:error ParticipantNotInRoom if the participant is not in the room
     */
    function updateScore(uint256 _id, address participant, uint256 score) external {
        GameRoom storage room = gameRooms[_id];
        if (room.creator != msg.sender) revert Unauthorized();
        if (room.status != RoomStatus.ACTIVE) revert GameRoomNotActive();
        if (room.participants[participant].participantAddress == address(0)) revert ParticipantNotInRoom();
        
        room.participants[participant].score = score;
    }

    /**
     * @dev Internal function to determine winners based on scores and split rule
     * @notice Sorts participants by score (descending) and selects winners based on WinnerSplitRule
     * @param _id The room ID
     * @return Array of winner addresses sorted by score (highest first)
     * @custom:error NoParticipants if room has no participants
     */
    function determineWinners(uint256 _id) private view returns (address[] memory) {
        GameRoom storage room = gameRooms[_id];
        if (room.participantList.length == 0) revert NoParticipants();
        
        // Create a copy of participant list for sorting
        address[] memory sortedParticipants = new address[](room.participantList.length);
        for (uint256 i = 0; i < room.participantList.length; i++) {
            sortedParticipants[i] = room.participantList[i];
        }
        
        // Simple bubble sort by score (descending)
        for (uint256 i = 0; i < sortedParticipants.length; i++) {
            for (uint256 j = 0; j < sortedParticipants.length - i - 1; j++) {
                if (room.participants[sortedParticipants[j]].score < room.participants[sortedParticipants[j + 1]].score) {
                    address temp = sortedParticipants[j];
                    sortedParticipants[j] = sortedParticipants[j + 1];
                    sortedParticipants[j + 1] = temp;
                }
            }
        }
        
        // Determine number of winners based on split rule
        uint256 winnerCount;
        if (room.winnerSplitRule == WinnerSplitRule.TOP_1) {
            winnerCount = 1;
        } else if (room.winnerSplitRule == WinnerSplitRule.TOP_2) {
            winnerCount = 2;
        } else if (room.winnerSplitRule == WinnerSplitRule.TOP_3) {
            winnerCount = 3;
        }
        
        // Ensure we don't exceed available participants
        if (winnerCount > sortedParticipants.length) {
            winnerCount = sortedParticipants.length;
        }
        
        // Create winners array
        address[] memory winners = new address[](winnerCount);
        for (uint256 i = 0; i < winnerCount; i++) {
            winners[i] = sortedParticipants[i];
        }
        
        return winners;
    }

    /**
     * @dev Internal function to distribute prize pool to winners according to split rule
     * @notice Prize distribution:
     *   - TOP_1: 100% to 1st place
     *   - TOP_2: 60% to 1st place, 40% to 2nd place
     *   - TOP_3: 50% to 1st place, 30% to 2nd place, 20% to 3rd place
     * @param winners The array of winner addresses
     * @custom:error NoParticipants if no winners are determined
     */
    function payWinners(address[] memory winners, uint256 _id) private {
        GameRoom storage room = gameRooms[_id];
        if (winners.length == 0) revert NoParticipants();
        
        uint256 totalPrize = room.totalPrizePool;
        
        if (room.winnerSplitRule == WinnerSplitRule.TOP_1) {
            // 100% to winner
            sendToken(room.currency, winners[0], totalPrize);
            room.participants[winners[0]].isWinner = true;
        } else if (room.winnerSplitRule == WinnerSplitRule.TOP_2) {
            if (winners.length < 2) revert IncompleteWinners();
            // 60% to 1st, 40% to 2nd
            uint256 firstPrize = (totalPrize * 60) / 100;
            uint256 secondPrize = totalPrize - firstPrize;
            sendToken(room.currency, winners[0], firstPrize);
            sendToken(room.currency, winners[1], secondPrize);
            room.participants[winners[1]].isWinner = true;
            room.participants[winners[0]].isWinner = true;
        } else if (room.winnerSplitRule == WinnerSplitRule.TOP_3) {
            // 50% to 1st, 30% to 2nd, 20% to 3rd
            if (winners.length < 3) revert IncompleteWinners();
            uint256 firstPrize = (totalPrize * 50) / 100;
            uint256 secondPrize = (totalPrize * 30) / 100;
            uint256 thirdPrize = totalPrize - firstPrize - secondPrize;
            sendToken(room.currency, winners[0], firstPrize);
            room.participants[winners[0]].isWinner = true;
            sendToken(room.currency, winners[1], secondPrize);
            room.participants[winners[1]].isWinner = true;
            sendToken(room.currency, winners[2], thirdPrize);
            room.participants[winners[2]].isWinner = true;
        }
    }

    /**
     * @notice Completes a game room, determines winners, and distributes prizes
     * @dev Only the room creator can complete. Room must be ACTIVE and current time >= endTime.
     *      Calls determineWinners() and payWinners() internally
     * @param _id The room ID to complete
     * @custom:error Unauthorized if caller is not the room creator
     * @custom:error GameRoomNotActive if room is not in ACTIVE status
     * @custom:error InvalidTime if current time is before the room's endTime
     * @custom:security Uses nonReentrant modifier to prevent reentrancy attacks
     * @custom:event Emits GameRoomCompleted event upon successful completion
     */
    function completeGameRoom(uint256 _id) external nonReentrant {
        GameRoom storage room = gameRooms[_id];
        if (room.creator != msg.sender) revert Unauthorized();
        if (room.status != RoomStatus.ACTIVE) revert GameRoomNotActive();
        if (block.timestamp < room.endTime) revert InvalidTime();
        
        address[] memory winners = determineWinners(_id);
        payWinners(winners, _id);
        
        room.status = RoomStatus.COMPLETED;
        emit GameRoomCompleted(room.name, block.timestamp);
    }

}