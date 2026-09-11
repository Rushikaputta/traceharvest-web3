const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TraceHarvest", function () {
  let contract, admin, farmer, distributor, vendor, canteen;

  beforeEach(async function () {
    [admin, farmer, distributor, vendor, canteen] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TraceHarvest");
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    await contract.grantFarmer(farmer.address);
    await contract.grantDistributor(distributor.address);
    await contract.grantVendor(vendor.address);
    await contract.grantCanteen(canteen.address);
  });

  it("registers a batch and walks it through the full supply chain", async function () {
    await contract.connect(farmer).registerBatch("Tomatoes", "Ramesh Farms", "ipfs://origin-cert");
    let batch = await contract.getBatch(1);
    expect(batch.cropName).to.equal("Tomatoes");
    expect(batch.currentStage).to.equal(0); // Registered

    await contract.connect(distributor).markInTransit(1, "Picked up, cold chain OK", "");
    await contract.connect(vendor).markAtVendor(1, "Arrived at campus store", "");
    await contract.connect(canteen).confirmDelivery(1, "Received at Hostel Mess 2", "");

    batch = await contract.getBatch(1);
    expect(batch.currentStage).to.equal(3); // Delivered

    const history = await contract.getHistory(1);
    expect(history.length).to.equal(4);
  });

  it("rejects out-of-order stage updates", async function () {
    await contract.connect(farmer).registerBatch("Rice", "Sita Farms", "");
    await expect(
      contract.connect(vendor).markAtVendor(1, "skip ahead", "")
    ).to.be.revertedWith("Stages must advance in order");
  });

  it("rejects actions from unauthorized roles", async function () {
    await expect(
      contract.connect(vendor).registerBatch("Wheat", "Fake Farmer", "")
    ).to.be.revertedWith("Caller is not a registered farmer");
  });
});
