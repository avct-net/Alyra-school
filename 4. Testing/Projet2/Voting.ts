import { expect } from "chai";
import { network } from "hardhat";

const connection = await network.create();
const { ethers } = connection;

enum WorkflowStatus {
    RegisteringVoters,
    ProposalsRegistrationStarted,
    ProposalsRegistrationEnded,
    VotingSessionStarted,
    VotingSessionEnded,
    VotesTallied
}

async function deployVoting() {
    const [owner, voter1, voter2, voter3, nonvoter] = await ethers.getSigners();
    const voting = await ethers.deployContract("Voting");
    
    return { voting, owner, voter1, voter2, voter3, nonvoter };
}

async function deployWithRegisteredVoters() {
    const { voting, owner, voter1, voter2, voter3, nonvoter } = await deployVoting();

    await voting.connect(owner).addVoter(voter1.address);
    await voting.connect(owner).addVoter(voter2.address);
    await voting.connect(owner).addVoter(voter3.address);

    return { voting, owner, voter1, voter2, voter3, nonvoter };
}

async function deployWithRegistredProposition() {
    const { voting, owner, voter1, voter2, nonvoter } = await deployWithRegisteredVoters();
    
    await voting.connect(owner).startProposalsRegistering();
    await voting.connect(voter1).addProposal("Proposition A");
    await voting.connect(owner).endProposalsRegistering();
    await voting.connect(owner).startVotingSession();

    return { voting, owner, voter1, voter2, nonvoter };
}

// Initialisation
describe("Deployment", function () {
    it("Should initialize the owner and the starting status", async function () {
        const { voting, owner } = await deployVoting();
        
        expect(await voting.owner()).to.equal(owner.address);
        expect(await voting.workflowStatus()).to.equal(WorkflowStatus.RegisteringVoters);
    });
});

// Voters registration
describe("Voters Registration", function () {
    it("Should allow the owner to add a voter and emit the event", async function () {
        const { voting, owner, voter1 } = await deployVoting();

        await expect(voting.connect(owner).addVoter(voter1.address))
        .to.emit(voting, "VoterRegistered")
        .withArgs(voter1.address);

        const voterData = await voting.connect(voter1).getVoter(voter1.address);
        expect(voterData.isRegistered).to.be.true;
    });

    it("Should reject the addition if the caller is not the owner", async function () {
        const { voting, voter1, voter2 } = await deployVoting();

        await expect(voting.connect(voter1).addVoter(voter2.address))
        .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
        .withArgs(voter1.address);
    });

    it("Should reject the addition if the voter is already registered", async function () {
        const { voting, owner, voter1 } = await deployVoting();
        await voting.connect(owner).addVoter(voter1.address);

        await expect(voting.connect(owner).addVoter(voter1.address))
        .to.be.revertedWith("Already registered");
    });

    it("Should reject the addition if the WorkflowStatus is not RegisteringVoters", async function () {
        const { voting, owner, voter1 } = await deployVoting();
        await voting.connect(owner).startProposalsRegistering();

        await expect(voting.connect(owner).addVoter(voter1.address))
        .to.be.revertedWith("Voters registration is not open yet");
    });
});

// Submission of proposals
describe("Proposals", function () {
    it("Should reject the proposals if the session is not open", async function () {
        const { voting, voter1 } = await deployWithRegisteredVoters();

        await expect(voting.connect(voter1).addProposal("Proposition 2"))
        .to.be.revertedWith("Proposals are not allowed yet");
    });

    it("Should not allow a non-owner to register a voter", async () => {
        const { voting, owner, voter1, voter2 } = await deployWithRegisteredVoters();

        await expect(voting.connect(voter1).addVoter(voter2.address))
        .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
    });

    it("Should refuse an empty proposal", async function () {
        const { voting, owner, voter1 } = await deployWithRegisteredVoters();
        await voting.connect(owner).startProposalsRegistering();

        await expect(voting.connect(voter1).addProposal(""))
        .to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
    });

    it("Should allow a registered voter to add a valid proposal", async function () {
        const { voting, owner, voter1 } = await deployWithRegisteredVoters();
        await voting.connect(owner).startProposalsRegistering();

        await expect(voting.connect(voter1).addProposal("Proposition 1"))
        .to.emit(voting, "ProposalRegistered")
        .withArgs(1);

        const proposal = await voting.connect(voter1).getOneProposal(1);
        expect(proposal.description).to.equal("Proposition 1");
        expect(proposal.voteCount).to.equal(0);
    });
});

// voting session
describe("Voting session", function () {
    it("Should prohibit voting by those not registered as voters", async function () {
        const { voting, nonvoter } = await deployWithRegistredProposition();

        await expect(voting.connect(nonvoter).setVote(1))
        .to.be.revertedWith("You're not a voter");
    });

    it("Should correctly record the vote and increment the counter", async function () {
        const { voting, voter1 } = await deployWithRegistredProposition();

        await expect(voting.connect(voter1).setVote(1))
        .to.emit(voting, "Voted")
        .withArgs(voter1.address, 1);

        const voterInfo = await voting.connect(voter1).getVoter(voter1.address);
        expect(voterInfo.hasVoted).to.be.true;
        expect(voterInfo.votedProposalId).to.equal(1);

        const proposalInfo = await voting.connect(voter1).getOneProposal(1);
        expect(proposalInfo.voteCount).to.equal(1);
    });

    it("Should prohibit voting twice", async function () {
        const { voting, voter1 } = await deployWithRegistredProposition();
        await voting.connect(voter1).setVote(1);

        await expect(voting.connect(voter1).setVote(1))
        .to.be.revertedWith("You have already voted");
    });

    it("Should reject the vote on a non-existent proposal", async function () {
        const { voting, voter1 } = await deployWithRegistredProposition();

        await expect(voting.connect(voter1).setVote(10000))
        .to.be.revertedWith("Proposal not found");
    });
});

// vote count
describe("Vote tallying", function () {
    it("Should identify the correct winner after the vote", async function () {
        const { voting, owner, voter1, voter2 } = await deployWithRegisteredVoters();

        console.log("Accelerated workflow");
        await voting.connect(owner).startProposalsRegistering();
        await voting.connect(voter1).addProposal("Proposition Unique"); // ID 1
        await voting.connect(owner).endProposalsRegistering();
        await voting.connect(owner).startVotingSession();
        
        console.log("Voter 1 and Voter 2 vote for proposal ID 1");
        await voting.connect(voter1).setVote(1);
        await voting.connect(voter2).setVote(1);

        await voting.connect(owner).endVotingSession();

        console.log("Vote count");
        await expect(voting.connect(owner).tallyVotes())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);

        console.log("Verification of the winner");
        expect(await voting.winningProposalID()).to.equal(1);
        expect(await voting.workflowStatus()).to.equal(WorkflowStatus.VotesTallied);
    });
});