const Proposer = require("../proposer");
const Acceptor = require("../acceptor");
const Learner = require("../learner");
const Simulator = require("../simulator");
const Quorum = require("../quorum");

console.log("\n====================================");
console.log("PART 8: HARDENING PAXOS");
console.log("====================================");
console.log("Implementing 5 defensive mechanisms to strengthen Paxos against failures.\n");

// ============================================
// HARDENING #1: Protect Quorum Rules
// ============================================
// Task: Implement quorum validation to reject unsafe quorum configurations before deployment.
// Current Weakness: A developer weakens the quorum rule and accidentally removes quorum overlap.
// Hardening Strategy: validateQuorum() rejects configurations where quorum size is too small
//                     to guarantee overlap between any two quorums.

console.log("\n============================================");
console.log("HARDENING #1: Protect Quorum Rules");
console.log("============================================");
console.log("Validating quorum configurations before deployment...\n");

function validateQuorum(totalNodes, quorumSize) {
    // The minimum safe quorum is a strict majority: floor(totalNodes / 2) + 1
    const minimumQuorum = Math.floor(totalNodes / 2) + 1;

    if (quorumSize < minimumQuorum) {
        throw new Error(
            "Unsafe quorum configuration blocked: " +
            "quorumSize=" + quorumSize +
            " but minimum majority required=" + minimumQuorum +
            ". Without majority quorums, two quorums may not overlap, " +
            "allowing conflicting values to be chosen."
        );
    }

    // Additional check: quorum must not be so large that it prevents progress
    if (quorumSize > totalNodes) {
        throw new Error(
            "Unsafe quorum configuration blocked: " +
            "quorumSize=" + quorumSize +
            " exceeds totalNodes=" + totalNodes +
            ". Consensus can never progress without a reachable quorum."
        );
    }

    console.log("[PASS] Quorum configuration validated: " +
        totalNodes + " nodes, quorum=" + quorumSize +
        " (majority=" + minimumQuorum + ")");
    return true;
}

// Test 1a: Safe configuration (3 nodes, quorum=2)
try {
    validateQuorum(3, 2);
} catch (error) {
    console.log("[BLOCKED]", error.message);
}

// Test 1b: Unsafe configuration (5 nodes, quorum=2 - not a majority)
try {
    validateQuorum(5, 2);
} catch (error) {
    console.log("[BLOCKED]", error.message);
}

// Test 1c: Unsafe configuration (quorum > total nodes)
try {
    validateQuorum(3, 5);
} catch (error) {
    console.log("[BLOCKED]", error.message);
}

console.log("\nResult: Unsafe quorum configurations are rejected before deployment.");
console.log("This prevents the system from starting with a configuration that could");
console.log("allow two non-overlapping quorums to choose different values.");

// ============================================
// HARDENING #2: Detect State Loss
// ============================================
// Task: Implement state integrity validation to detect acceptor state loss.
// Current Weakness: An acceptor loses previously accepted values after a restart.
// Hardening Strategy: Monitor acceptor state and detect when critical fields
//                     are reset to zero/null unexpectedly.

console.log("\n============================================");
console.log("HARDENING #2: Detect State Loss");
console.log("============================================");
console.log("Simulating acceptor state monitoring...\n");

// Track known-good state for comparison
const knownGoodState = new Map();

function snapshotState(acceptor) {
    knownGoodState.set(acceptor.id, {
        highestPromised: acceptor.highestPromised,
        acceptedProposal: acceptor.acceptedProposal
    });
    console.log("[SNAPSHOT] Saved known-good state for " + acceptor.id);
}

function checkStateIntegrity(acceptor) {
    const snapshot = knownGoodState.get(acceptor.id);

    if (!snapshot) {
        console.log("[WARN] No baseline state for " + acceptor.id + " - skipping check");
        return;
    }

    const issues = [];

    // Detect highestPromised reset to 0 (indicates restart without recovery)
    if (acceptor.highestPromised === 0 && snapshot.highestPromised !== 0) {
        issues.push("highestPromised was " + snapshot.highestPromised + " but now 0");
    }

    // Detect acceptedProposal reset to null when it previously had a value
    if (acceptor.acceptedProposal === null && snapshot.highestPromised !== 0) {
        issues.push("acceptedProposal was lost (was proposal " + snapshot.acceptedProposal.number + ")");
    }

    if (issues.length > 0) {
        console.log("[ALERT] State loss detected on " + acceptor.id + ":");
        issues.forEach(function(issue) {
            console.log("  - " + issue);
        });
        console.log("[ACTION] Initiating state recovery protocol for " + acceptor.id);
        return false; // integrity check failed
    }

    console.log("[OK] State integrity verified for " + acceptor.id);
    return true; // integrity check passed
}

// Create acceptors and simulate normal operation
const acceptorA = new Acceptor("A1");
const proposerTemp = new Proposer("P-temp");

// Simulate some protocol activity
const proposal1 = proposerTemp.nextProposal("value-before-failure");
acceptorA.prepare(proposal1.number);
acceptorA.accept(proposal1);

// Take a snapshot of healthy state
snapshotState(acceptorA);

// Simulate crash/restart that loses state
acceptorA.highestPromised = 0;
acceptorA.acceptedProposal = null;
console.log("\n[SIMULATION] Acceptor A1 crashed and lost persistent state.\n");

// Run integrity check
checkStateIntegrity(acceptorA);

console.log("\nResult: State loss detection enables automatic recovery protocols.");
console.log("Acceptors that detect state loss can request the latest state from peers");
console.log("before participating in consensus, preventing safety violations.");

// ============================================
// HARDENING #3: Majority Health Check
// ============================================
// Task: Implement health checks that disable new proposals when quorum cannot be formed.
// Current Weakness: The system continues accepting requests even when no majority exists.
// Hardening Strategy: Before starting a consensus round, verify that enough acceptors
//                     are online to form a quorum.

console.log("\n============================================");
console.log("HARDENING #3: Majority Health Check");
console.log("============================================");
console.log("Testing quorum availability before proposal execution...\n");

function checkQuorumHealth(acceptors, quorumSize) {
    const onlineCount = acceptors.filter(function(a) {
        return a.online;
    }).length;

    const canFormQuorum = onlineCount >= quorumSize;

    console.log("Health check: " + onlineCount + "/" + acceptors.length +
        " acceptors online (quorum required: " + quorumSize + ")");

    if (!canFormQuorum) {
        console.log("[BLOCKED] Quorum unavailable - disabling new proposals");
        console.log("[REASON] Cannot guarantee safety without majority agreement");
        return false;
    }

    console.log("[OK] Quorum available - proposals enabled");
    return true;
}

// Scenario 3a: All acceptors online - should pass
const healthyAcceptors = [
    new Acceptor("H1"),
    new Acceptor("H2"),
    new Acceptor("H3")
];
console.log("--- Test: All acceptors healthy ---");
checkQuorumHealth(healthyAcceptors, 2);

// Scenario 3b: Majority lost - should fail
const degradedAcceptors = [
    new Acceptor("D1"),
    new Acceptor("D2"),
    new Acceptor("D3")
];
degradedAcceptors[1].fail();
degradedAcceptors[2].fail();
console.log("\n--- Test: Majority lost (2/3 offline) ---");
checkQuorumHealth(degradedAcceptors, 2);

console.log("\nResult: Proposals are safely disabled when quorum is unavailable.");
console.log("This prevents the system from making progress in a state where safety");
console.log("cannot be guaranteed, avoiding split-brain scenarios.");

// ============================================
// HARDENING #4: Detect Proposer Instability
// ============================================
// Task: Implement monitoring that detects excessive proposal churn.
// Current Weakness: Multiple proposers continuously compete, wasting resources.
// Hardening Strategy: Track proposal rates and detect when churn exceeds thresholds,
//                     then recommend leader stabilisation (Multi-Paxos).

console.log("\n============================================");
console.log("HARDENING #4: Detect Proposer Instability");
console.log("============================================");
console.log("Monitoring proposal activity for churn detection...\n");

function ProposerMonitor() {
    this.proposalLog = [];
    this.alerts = [];
}

ProposerMonitor.prototype.recordProposal = function(proposerId, proposalNumber, timestamp) {
    this.proposalLog.push({
        proposer: proposerId,
        number: proposalNumber,
        time: timestamp
    });
};

ProposerMonitor.prototype.detectChurn = function(windowSize) {
    // Count proposals per proposer in the recent window
    const recent = this.proposalLog.slice(-windowSize);
    const counts = {};
    let total = recent.length;

    recent.forEach(function(entry) {
        if (!counts[entry.proposer]) {
            counts[entry.proposer] = 0;
        }
        counts[entry.proposer]++;
    });

    console.log("Proposal activity (last " + windowSize + " proposals):");
    Object.keys(counts).forEach(function(pid) {
        console.log("  " + pid + ": " + counts[pid] + " proposals (" +
            Math.round(counts[pid] / total * 100) + "%)");
    });

    // Detect if proposals are spread across too many proposers (instability)
    const uniqueProposers = Object.keys(counts).length;
    if (uniqueProposers > 2 && total >= 5) {
        const alert = "High proposer churn detected: " + uniqueProposers +
            " active proposers in last " + total + " proposals. " +
            "Recommend leader stabilisation via Multi-Paxos.";
        this.alerts.push(alert);
        console.log("\n[ALERT] " + alert);
        return true; // churn detected
    }

    console.log("\n[OK] Proposer activity within normal parameters");
    return false; // no churn issue
};

// Simulate proposer churn scenario
const monitor = new ProposerMonitor();

// Simulate rapid proposal generation from multiple proposers
const timestamps = [1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009];
const proposers = ["P1", "P2", "P3", "P1", "P2", "P3", "P1", "P2", "P3", "P1"];
const proposalNums = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

for (let i = 0; i < 10; i++) {
    monitor.recordProposal(proposers[i], proposalNums[i], timestamps[i]);
}

const churnDetected = monitor.detectChurn(10);

if (churnDetected) {
    console.log("\n[RECOMMENDATION] Implement leader election:");
    console.log("  1. Elect a stable primary proposer");
    console.log("  2. Use Multi-Paxos to batch proposals under stable leader");
    console.log("  3. Fall back to election only when leader fails");
}

console.log("\nResult: Proposer instability monitoring enables proactive leader election.");
console.log("While Paxos remains correct with multiple proposers, excessive churn");
console.log("reduces throughput. Multi-Paxos stabilises a leader to improve efficiency.");

// ============================================
// HARDENING #5: Improve Observability
// ============================================
// Task: Extend audit logs to record protocol events for debugging and analysis.
// Current Weakness: The system provides little visibility into protocol decisions.
// Hardening Strategy: Implement comprehensive audit logging of all protocol events.

console.log("\n============================================");
console.log("HARDENING #5: Improve Observability");
console.log("============================================");
console.log("Implementing comprehensive audit logging...\n");

function AuditLogger() {
    this.entries = [];
}

AuditLogger.prototype.log = function(eventType, details) {
    const entry = {
        timestamp: Date.now(),
        event: eventType,
        details: details
    };
    this.entries.push(entry);
    console.log("[AUDIT][" + eventType + "] " + JSON.stringify(details));
};

AuditLogger.prototype.getSummary = function() {
    const summary = {
        totalEvents: this.entries.length,
        prepareCount: this.entries.filter(function(e) {
            return e.event === "PREPARE";
        }).length,
        promiseCount: this.entries.filter(function(e) {
            return e.event === "PROMISE";
        }).length,
        acceptCount: this.entries.filter(function(e) {
            return e.event === "ACCEPT";
        }).length,
        chosenCount: this.entries.filter(function(e) {
            return e.event === "CHOSEN";
        }).length
    };
    return summary;
};

// Create audit logger and wrap simulator operations
const audit = new AuditLogger();

// Demonstrate audit logging with a full consensus round
console.log("--- Simulating consensus with full audit trail ---\n");

const auditProposer = new Proposer("P-audit");
const auditAcceptors = [
    new Acceptor("A-a1"),
    new Acceptor("A-a2"),
    new Acceptor("A-a3")
];
const auditLearners = [
    new Learner("L-a1")
];

// Audit-wrap the simulator run
audit.log("DEPLOYMENT", {
    component: "PaxosCluster",
    acceptors: auditAcceptors.length,
    learners: auditLearners.length,
    quorumSize: Math.floor(auditAcceptors.length / 2) + 1
});

// Prepare phase with audit
const auditProposal = auditProposer.nextProposal("audited-value");
audit.log("PROPOSAL_CREATED", {
    proposer: auditProposer.id,
    proposalNumber: auditProposal.number,
    value: auditProposal.value
});

const auditPromises = [];
auditAcceptors.forEach(function(acceptor) {
    audit.log("PREPARE_SENT", {
        proposer: auditProposer.id,
        target: acceptor.id,
        proposalNumber: auditProposal.number
    });

    const response = acceptor.prepare(auditProposal.number);
    if (response) {
        audit.log("PROMISE_RECEIVED", {
            acceptor: acceptor.id,
            proposalNumber: response.proposalNumber,
            previouslyAccepted: response.accepted ?
                { number: response.accepted.number, value: response.accepted.value } : null
        });
        auditPromises.push(response);
    }
});

audit.log("QUORUM_CHECK", {
    phase: "PREPARE",
    promisesReceived: auditPromises.length,
    required: Math.floor(auditAcceptors.length / 2) + 1,
    quorumReached: auditPromises.length >= Math.floor(auditAcceptors.length / 2) + 1
});

// Accept phase with audit
const auditAccepted = [];
auditAcceptors.forEach(function(acceptor) {
    const response = acceptor.accept(auditProposal);
    if (response) {
        audit.log("ACCEPT_RECEIVED", {
            acceptor: acceptor.id,
            proposalNumber: auditProposal.number,
            value: auditProposal.value
        });
        auditAccepted.push(response);
    }
});

audit.log("QUORUM_CHECK", {
    phase: "ACCEPT",
    acceptancesReceived: auditAccepted.length,
    required: Math.floor(auditAcceptors.length / 2) + 1,
    quorumReached: auditAccepted.length >= Math.floor(auditAcceptors.length / 2) + 1
});

// Learn phase with audit
audit.log("VALUE_CHOSEN", {
    proposalNumber: auditProposal.number,
    value: auditProposal.value,
    acceptors: auditAccepted.map(function(a) { return a.acceptor; })
});

auditLearners.forEach(function(learner) {
    learner.learn(auditProposal.value);
    audit.log("VALUE_LEARNED", {
        learner: learner.id,
        value: auditProposal.value,
        proposalNumber: auditProposal.number
    });
});

// Print audit summary
const summary = audit.getSummary();
console.log("\n--- Audit Summary ---");
console.log("Total events logged: " + summary.totalEvents);
console.log("Prepare requests: " + summary.prepareCount);
console.log("Promises received: " + summary.promiseCount);
console.log("Acceptances received: " + summary.acceptCount);
console.log("Values chosen: " + summary.chosenCount);

console.log("\nResult: Comprehensive audit logging provides full visibility into protocol");
console.log("decisions. This enables debugging, forensic analysis after failures, and");
console.log("operational monitoring to detect anomalies in production systems.");

// ============================================
// FINAL SUMMARY
// ============================================
console.log("\n====================================");
console.log("HARDENING COMPLETE");
console.log("====================================");
console.log("\nImplemented defensive mechanisms:");
console.log("  1. Quorum rule validation - prevents unsafe configurations");
console.log("  2. State loss detection - monitors acceptor integrity");
console.log("  3. Majority health checks - disables proposals without quorum");
console.log("  4. Proposer churn monitoring - detects instability");
console.log("  5. Audit logging - improves observability");
console.log("\nThese hardening measures address the five failure modes:");
console.log("  - Quorum misconfiguration -> Task 8.1");
console.log("  - Acceptor state loss     -> Task 8.2");
console.log("  - Network partitions      -> Task 8.3");
console.log("  - Proposer instability    -> Task 8.4");
console.log("  - Lack of observability   -> Task 8.5");