# paxos-lab

Paxos Consensus Algorithm Simulator - Workshop for Fundamentals of System Security (COMSM0122)

## Overview

This project implements a simplified JavaScript simulation of the Paxos consensus algorithm. It is designed as an educational tool to help students understand how distributed systems achieve agreement despite failures, node crashes, network partitions, and other adversarial conditions.

The simulator models the core Paxos components: proposers, acceptors, learners, quorums, and network communication. Through a series of guided scenarios, users can observe protocol behaviour, introduce failures, and analyse the resulting outcomes.

## Prerequisites

- Node.js (version 18 or newer)
- npm (comes with Node.js)

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

## Project Structure

```
paxos-lab/
├── package.json
├── simulator.js          # Consensus engine (core Paxos protocol)
├── proposal.js           # Proposal class (number + value)
├── proposer.js           # Proposer class (proposal generation)
├── acceptor.js           # Acceptor class (prepare/accept logic)
├── learner.js            # Learner class (learn chosen values)
├── quorum.js             # Quorum engine (majority calculation)
├── network.js            # Network simulator (message delivery/partition)
├── assumption_failures.js # Failure simulation utilities
└── scenarios/
    ├── happy_path.js                 # Part 1: Basic consensus
    ├── acceptor_failure.js           # Part 2: Acceptor failure
    ├── competing_proposers.js        # Part 3: Competing proposers
    ├── partial_acceptance.js         # Part 4: Partial acceptance
    ├── preserve_chosen_value.js      # Part 5: Preserving chosen values
    ├── multi_paxos.js                # Part 6: Multi-Paxos
    ├── network_partition.js          # Part 7.1: Network partition
    ├── hardening.js                  # Part 8: Hardening (defensive mechanisms)
    └── breaking_assumptions/
        ├── majority_loss.js          # Part 7.2: Loss of majority
        ├── state_loss.js             # Part 7.3: Loss of persistent state
        └── quorum_misconfiguration.js # Part 7.4: Unsafe quorum config
```

## Component Responsibilities

### Proposal (proposal.js)

Represents a Paxos proposal containing a proposal number and a proposed value. Proposal numbers provide ordering and allow Paxos to resolve contention between competing proposers.

### Proposer (proposer.js)

Represents a participant responsible for initiating consensus. Creates proposals and generates increasing proposal numbers.

### Acceptor (acceptor.js)

The most important role in Paxos. Receives Prepare requests, issues Promises, accepts proposals, remembers previously accepted values, and participates in quorum formation. Acceptors collectively determine which values can be chosen.

### Learner (learner.js)

Represents components that learn the final decision. Receives chosen values and updates local state. Learners do not vote and do not influence the consensus process.

### Quorum Engine (quorum.js)

Determines the minimum number of acceptors required for agreement. Calculates majority size, verifies quorum formation, and enforces quorum-based safety.

### Network Simulator (network.js)

Provides a simplified representation of network communication, including communication failures, network partitions, and message loss.

### Consensus Engine (simulator.js)

Implements the core Paxos protocol: generates proposals, collects promises, collects acceptances, validates quorum formation, preserves previously accepted values, and notifies learners.

## Running Scenarios

Each scenario is executed using npm scripts defined in package.json:

```bash
# Part 1: Understanding Consensus (happy path)
npm run happy

# Part 2: Acceptor Failure
npm run failure

# Part 3: Competing Proposers
npm run proposers

# Part 4: Partial Acceptance
npm run partial

# Part 5: Preserving Chosen Values
npm run preserve

# Part 6: Multi-Paxos
npm run multi

# Part 7.1: Network Partition
npm run partition

# Part 7.2: Majority Loss
npm run majority-loss

# Part 7.3: State Loss
npm run state-loss

# Part 7.4: Quorum Misconfiguration
npm run quorum-error

# Part 8: Hardening (all defensive mechanisms)
npm run hardening

# Run all main scenarios at once
npm run all
```

## Part 8: Hardening - Defensive Mechanisms

This section implements five defensive mechanisms to strengthen the Paxos implementation against failures:

### Task 8.1: Protect Quorum Rules

Implements `validateQuorum()` to reject unsafe quorum configurations before deployment. The function verifies that the quorum size represents a strict majority, preventing configurations where two quorums might not overlap (which would allow conflicting values to be chosen).

### Task 8.2: Detect State Loss

Implements state integrity validation that monitors acceptor state and detects when `highestPromised` is reset to 0 or `acceptedProposal` is lost after previously holding valid data. This enables automatic recovery protocols.

### Task 8.3: Majority Health Check

Implements health checks that verify quorum availability before executing proposals. If a majority of acceptors are unavailable (e.g., due to network partitions), new proposals are safely disabled to prevent unsafe progress.

### Task 8.4: Detect Proposer Instability

Implements a `ProposerMonitor` that tracks proposal activity and detects excessive churn across multiple competing proposers. When churn is detected, the system recommends leader stabilisation via Multi-Paxos.

### Task 8.5: Improve Observability

Implements a comprehensive `AuditLogger` that records all protocol events including proposal creation, prepare/accept messages, quorum checks, and chosen values. This provides full visibility into protocol decisions for debugging and operational monitoring.

## Key Paxos Concepts

- **Consensus**: The process by which distributed nodes agree on a single value
- **Quorum**: A majority of nodes (floor(n/2) + 1) required to make a decision
- **Proposal Numbers**: Monotonically increasing identifiers that establish ordering between competing proposals
- **Prepare Phase**: Proposer asks acceptors for promises (highest number promised so far)
- **Accept Phase**: Proposer sends accept requests with the value to be agreed upon
- **Learn Phase**: Learners discover the chosen value
- **Safety**: Once a value is chosen, it cannot be unchosen (consistency guarantee)
- **Liveness**: Eventually a value will be chosen (progress guarantee)

## Learning Objectives

By completing this workshop, you will understand:

1. How Paxos achieves consensus through quorum-based agreement
2. Why proposal numbers are essential for resolving contention
3. How acceptors preserve previously accepted values for safety
4. The role of majority quorums in fault tolerance
5. How network partitions and node failures affect consensus
6. Why quorum mathematics are security-critical
7. How to design defensive mechanisms for distributed systems

## License

MIT

## Author

Inah Omoronyia
