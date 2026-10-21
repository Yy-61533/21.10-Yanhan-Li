# paxos-lab: Paxos Consensus Simulation & Stress Testing

## Project Overview
This repository contains the experimental code for Workshop 3 of the **Fundamentals of System Security (COMSM0122)** course.

The primary objective of this project is to simulate the **Paxos consensus algorithm** in a distributed system using JavaScript. By building core components like Proposers, Acceptors, and Learners, I verified Paxos's safety and liveness under ideal conditions. More importantly, this project stress-tests the algorithm under extreme scenarios such as network partitions, node failures, and competing proposers.

To bridge the gap between theory and practice, I also implemented 5 defensive hardening mechanisms in Part 8 to improve the system's robustness and observability in real-world engineering environments.

## Directory Structure
```
paxos-lab/
├── core/                      # Core algorithm logic
│   ├── acceptor.js            # Acceptor node (handles Prepare/Accept requests)
│   ├── proposer.js            # Proposer node (initiates proposals)
│   ├── learner.js             # Learner node (learns the chosen value)
│   ├── network.js             # Simulates network delays and message drops
│   └── ...
├── scenarios/                 # Experimental scenario scripts
│   ├── happy_path.js          # Part 1: Normal consensus flow
│   ├── acceptor_failure.js    # Part 2: Node crash testing
│   ├── competing_proposers.js # Part 3: Livelock and competition testing
│   ├── network_partition.js   # Part 7: Split-brain and network partitions
│   ├── hardening.js           # Part 8: Defensive mechanisms implementation
│   └── breaking_assumptions/  # Extreme tests breaking core assumptions
├── package.json               # Dependencies and run scripts configuration
└── README.md                  # This file
```

## How to Run
1. **Install dependencies**:
```
npm install
```
2. **Run basic scenarios (Part 1-7)**:
Use `npm run` to execute the corresponding scenario scripts. For example:
```
npm run happy-path
npm run network-partition
```
3. **Run hardening tests (Part 8)**:
```
npm run hardening
```
This script sequentially demonstrates 5 defensive strategies, including Quorum validation, state loss detection, majority health checks, proposer instability monitoring, and audit logging.

## Key Takeaways
- **Safety vs Liveness**: Paxos strictly guarantees safety (no incorrect value is ever chosen), but it can suffer from livelock (liveness failure) when multiple proposers compete. Multi-Paxos is an effective engineering solution to stabilize the leader.
- **The Importance of Quorums**: The fault tolerance limit is F = (N-1)/2. If a majority of nodes are lost or a network partition prevents a quorum from forming, the system must halt writes to preserve consistency.
- **Engineering Defenses**: Theoretical Paxos assumes nodes never lose state. In actual deployments, it is mandatory to implement state snapshots, heartbeat mechanisms, and strict configuration validation to prevent split-brain scenarios caused by misconfigured quorums.

## Submission Note
This repository contains the complete experimental code and outputs. All Parts' Reflections and the Hardening tasks have been completed according to the workshop requirements.

> **Note**: This is a purely educational simulation project. No real networking libraries are used; all network interactions are simulated entirely in memory.
