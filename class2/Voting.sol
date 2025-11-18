// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

// Vote for a candidate
// Register a candidate
// Get a candidate
// Get a candidate with the highest vote
// Register a voter
// Voter cannot vote more than once
// Set voting duration
// Availability of record

contract VotingContract {
    // Candidate object
    struct Candidate {
        uint256 id;
        string name;
        uint256 score;
        bool winner;
    }

    event CandidateRegistered(string name, uint256 id);
    event CandidateWon(string name, uint256 id);
    event userVoted(address voter, uint256 candidateID, string name);

    // PROBLEM: Variables below are never used in the contract
    address public owner;
    uint256 private candidateCount = 1;
    uint256 public votingDuration = 200;
    bool public votingActive = true;
    uint256 public totalVotes = 0;
    uint256 public startTime = block.timestamp;

    // Store candidates
    // We can use a mapping or we can use an array id: candidate
    mapping(uint256 => Candidate) public candidates;
    Candidate[] public candidateArray;

    // A mapping for registered voters. 0x0efo3: true -- voter is regitered
    mapping(address => bool) public registeredVoters;

    // A mapping to show registered users who have voted
    mapping(address => bool) public hasVoted;

    constructor() {
        owner = msg.sender;
    }

    /**
     * Register a candidate
     * @param _name Name of the candidate
     * return name, id of the candidate
     */
    function registerCandidate(
        string memory _name
    ) public returns (string memory, uint256) {
        Candidate memory newCandidate = Candidate(
            candidateCount,
            _name,
            0,
            false
        );
        candidateArray.push(newCandidate);
        candidates[candidateCount] = newCandidate;
        // Broadcast a candidate has been registered
        emit CandidateRegistered(_name, candidateCount);
        candidateCount++; // increase the candidate count
        return (_name, newCandidate.id);
    }

    function getCandidate(uint256 _id) private view returns (Candidate memory) {
        return candidates[_id];
    }

    // WRONG: This should be done off-chain(in our client application)
    // as it will be very expensive to loop through all candidates on-chain
    function getCandidateWithHighestVote() public view returns (Candidate memory) {
        // Added fix to avoid returning wrong candidate
        // in a scenario where we only have one candidate
        uint256 initialMaxVote = candidateArray[0].score;
        uint256 winnerId = candidateArray[0].id;
        for (uint256 i = 0; i < candidateArray.length; i++) {
            if (candidateArray[i].score > initialMaxVote) {
                winnerId = candidateArray[i].id;
            }
        }
        return candidates[winnerId];
    }

    function registerAVoter() public {
        registeredVoters[msg.sender] = true;
    }

    function checkIfVoterIsRegistered(address voter) public view returns (bool) {
        // Added fix to check for the voter address passed in the argument
        return registeredVoters[voter];
    }

    function closeVoting() public {
        require(msg.sender == owner, "Only owner can close voting");
        votingActive = false;
    }

    function openVoting() public {
        require(msg.sender == owner, "Only owner can open voting");
        votingActive = true;
    }

    function voteForACandidate(uint256 id) public {
        require(registeredVoters[msg.sender], "Voter is not registered");
        require(!hasVoted[msg.sender], "Voter has already voted");
        require(
            block.timestamp <= startTime + votingDuration,
            "voting duration exceeded"
        );

        // Using if instead of revert so i get used to both
        if (id <= 0 || id > candidateCount) {
            revert("Candidate does not exist");
        }
        if (!votingActive) {
            revert("Voting is not active");
        }
        Candidate memory candidateToVote = candidates[id]; // Get the candidate
        candidateToVote.score += 1;
        totalVotes += 1;
        hasVoted[msg.sender] = true; // Mark that the voter has voted
        candidates[id] = candidateToVote;
        emit userVoted(msg.sender, id, candidateToVote.name);
    }

}
