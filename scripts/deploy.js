const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying TraceHarvest with account:", deployer.address);

  const TraceHarvest = await hre.ethers.getContractFactory("TraceHarvest");
  const contract = await TraceHarvest.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("TraceHarvest deployed to:", address);

  // OPTIONAL: bootstrap the deployer as every role so you can demo end-to-end
  // immediately without a separate role-management UI. Remove for production.
  const tx1 = await contract.grantFarmer(deployer.address);
  await tx1.wait();
  const tx2 = await contract.grantDistributor(deployer.address);
  await tx2.wait();
  const tx3 = await contract.grantVendor(deployer.address);
  await tx3.wait();
  const tx4 = await contract.grantCanteen(deployer.address);
  await tx4.wait();

  console.log("Deployer granted farmer/distributor/vendor/canteen roles for demo purposes.");
  console.log("\nSave this address into frontend/src/config.js -> CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
