import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Counter", async function () {
  let counter : any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    counter = await ethers.deployContract("Counter");
    [user1, user2] = await ethers.getSigners();
  });

  it("Should not increment x when  more than 5 inc() are called", async function () {
    await counter.connect(user1).inc();
    await counter.connect(user2).inc();
    await counter.inc();
    await counter.connect(user1).inc();
    await counter.connect(user1).inc();
    await expect(counter.connect(user1).inc()).to.be.revertedWith("inc: counter should be less than 5");
  });

  it("Should increment x when inc() is called", async function () {
    await counter.inc();
    expect(await counter.x()).to.be.equal(1n);
  });
  
  it("Should emit the Increment event when calling the inc() function", async function () {
    await expect(counter.inc()).to.emit(counter, "Increment").withArgs(1n);
  });

  it("The sum of the Increment events should match the current value", async function () {
    const deploymentBlockNumber = await ethers.provider.getBlockNumber();

    // run a series of increments
    for (let i = 1; i <= 10; i++) {
      await counter.incBy(i);
    }

    const events = await counter.queryFilter(
      counter.filters.Increment(),
      deploymentBlockNumber,
      "latest",
    );

    // check that the aggregated events match the current value
    let total = 0n;
    for (const event of events) {
      total += event.args.by;
    }

    expect(await counter.x()).to.equal(total);
  });
});
