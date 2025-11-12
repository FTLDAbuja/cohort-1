// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.30;

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

    address public owner;
    uint256 private candidateCount = 1;
    uint256 public votingDuration = 200;

    // Store candidates
    // We can use a mapping or we can use an array id: candidate
    mapping (uint256 => Candidate) public candidates;
    Candidate[] public candidateArray = [];

    // A mapping for registered voters. 0x0efo3: true -- voter is regitered
    mapping(address => bool) public registeredVoters;

    constructor() {
        owner = msg.sender;
    }

    /**
     * Register a candidate
     * @param name Name of the candidate
     * return name, id of the candidate
     */
    function registerCandidate(string memory _name) public returns (string memory, uint256) {
        Candidate memory newCandidate = Candidate(candidateCount, _name, 0, false);
        candidateArray.push(newCandidate);
        candidates[candidateCount] = newCandidate;
        // Broadcast a candidate has been registered
        emit CandidateRegistered(_name, candidateCount);
        candidateCount ++; // increase the candidate count 
    }

    function getCandidate(uint256 _id)  returns (Candidate memory) {
        return candidates[_id];
    }
    
    function getCandidateWithHighestVote() public returns (Candidate memory) {
        uint256 initialMaxVote = candidateArray[0].score;
        uint256 winnerId = 0;
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

    function checkIfVoterIsRegistered(address voter) public returns (bool) {
        return registeredVoters[msg.sender];
    }

    function voteForACandidate(uint256 id) public {
        if (registeredVoters[msg.sender] != true) revert ("Voter is not registered");
        // require(registeredVoters[msg.sender], "Voter is not registered");
        Candidate memory candidateToVote = candidates[id]; // Get the candidate
        candidateToVote.score += 1;
        candidates[id] = candidateToVote;

        emit userVoted(msg.sender, id, candidateToVote.name);
    }
}
