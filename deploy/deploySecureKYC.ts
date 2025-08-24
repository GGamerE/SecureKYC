import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying SecureKYC contract with deployer:", deployer);

  const secureKYC = await deploy("SecureKYC", {
    from: deployer,
    args: [],
    log: true,
  });

  console.log("SecureKYC contract deployed at:", secureKYC.address);
  
  // Log important information for users
  console.log("\n=== SecureKYC Deployment Complete ===");
  console.log("Contract Address:", secureKYC.address);
  console.log("Admin (initial authorized verifier):", deployer);
  console.log("\nNext steps:");
  console.log("1. Authorize additional KYC verifiers using setAuthorizedVerifier()");
  console.log("2. Users can submit KYC data using submitKYC()");
  console.log("3. Verifiers can approve KYC data using verifyKYC()");
  console.log("4. Set project requirements using setProjectRequirements()");
  console.log("5. Users can check eligibility and generate proofs");
};

func.tags = ["SecureKYC"];
func.id = "deploy_secure_kyc";

export default func;