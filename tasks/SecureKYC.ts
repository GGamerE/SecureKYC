import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("submit-kyc", "Submit KYC data for verification")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("passport", "Passport number (will be converted to address)")
  .addParam("birthyear", "Birth year (e.g., 1990)")
  .addParam("country", "Country code (1-255)")
  .setAction(async function (taskArguments: TaskArguments, { ethers, fhevm, deployments }) {
    const { passport, birthyear, country } = taskArguments;
    await fhevm.initializeCLIApi()
    const [signer] = await ethers.getSigners();
    console.log("Submitting KYC data with account:", signer.address);

    const secureKYCDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecureKYC");
    console.log(`SecureKYC: ${secureKYCDeployment.address}`);

    const contract = await ethers.getContractAt("SecureKYC", secureKYCDeployment.address);

    // Convert passport number to address format using keccak256
    const passportBytes = ethers.toUtf8Bytes(passport);
    const passportHash = ethers.keccak256(passportBytes);
    // Take the last 20 bytes (40 hex characters) to create an address
    const passportAddress = `0x${passportHash.slice(-40)}`;
    
    console.log("Passport converted to address:", passportAddress);
    
    // Create encrypted input
    const input = fhevm.createEncryptedInput(secureKYCDeployment.address, signer.address);
    input.addAddress(passportAddress); // passport as address
    input.add32(BigInt(birthyear));     // birth year
    input.add8(BigInt(country));        // country code

    const encryptedInput = await input.encrypt();

    const transaction = await contract.submitKYC(
      encryptedInput.handles[0], // passport address
      encryptedInput.handles[1], // birth year
      encryptedInput.handles[2], // country code
      encryptedInput.inputProof
    );

    await transaction.wait();
    console.log("KYC data submitted successfully!");
    console.log("Transaction hash:", transaction.hash);
  });

task("verify-kyc", "Verify a user's KYC data (authorized verifiers only)")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("user", "The user's address to verify")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { user } = taskArguments;

    const [signer] = await ethers.getSigners();
    console.log("Verifying KYC with account:", signer.address);

    const secureKYCDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecureKYC");
    console.log(`SecureKYC: ${secureKYCDeployment.address}`);

    const contract = await ethers.getContractAt("SecureKYC", secureKYCDeployment.address);

    const transaction = await contract.verifyKYC(user);
    await transaction.wait();

    console.log(`KYC verified for user: ${user}`);
    console.log("Transaction hash:", transaction.hash);
  });

task("set-project-requirements", "Set requirements for a project")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("projectid", "Project identifier (string)")
  .addParam("minage", "Minimum age requirement")
  .addParam("countries", "Allowed country codes (comma-separated, e.g., 1,2,3)")
  .addParam("passport", "Require passport (true/false)")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { projectid, minage, countries, passport } = taskArguments;

    const [signer] = await ethers.getSigners();
    console.log("Setting project requirements with account:", signer.address);

    const secureKYCDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecureKYC");
    console.log(`SecureKYC: ${secureKYCDeployment.address}`);

    const contract = await ethers.getContractAt("SecureKYC", secureKYCDeployment.address);

    const projectIdBytes32 = ethers.id(projectid);
    const allowedCountries = countries.split(",").map((c: string) => parseInt(c.trim()));
    const requiresPassport = passport.toLowerCase() === "true";

    const transaction = await contract.setProjectRequirements(
      projectIdBytes32,
      parseInt(minage),
      allowedCountries,
      requiresPassport
    );

    await transaction.wait();

    console.log(`Project requirements set for: ${projectid}`);
    console.log("Project ID (bytes32):", projectIdBytes32);
    console.log("Minimum age:", minage);
    console.log("Allowed countries:", allowedCountries);
    console.log("Requires passport:", requiresPassport);
    console.log("Transaction hash:", transaction.hash);
  });

task("check-eligibility", "Check eligibility for a project")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("user", "User address to check")
  .addParam("projectid", "Project identifier")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { user, projectid } = taskArguments;

    const [signer] = await ethers.getSigners();
    console.log("Checking eligibility with account:", signer.address);

    const secureKYCDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecureKYC");
    console.log(`SecureKYC: ${secureKYCDeployment.address}`);

    const contract = await ethers.getContractAt("SecureKYC", secureKYCDeployment.address);

    const projectIdBytes32 = ethers.id(projectid);

    try {
      const transaction = await contract.checkEligibility(user, projectIdBytes32);
      await transaction.wait();

      console.log(`Eligibility checked for user: ${user}`);
      console.log(`Project: ${projectid}`);
      console.log("Transaction hash:", transaction.hash);
      console.log("Note: Result is encrypted. Use frontend to decrypt the result.");
    } catch (error) {
      console.error("Error checking eligibility:", error);
    }
  });

task("generate-proof", "Generate proof of eligibility for a project")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("projectid", "Project identifier")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { projectid } = taskArguments;

    const [signer] = await ethers.getSigners();
    console.log("Generating proof with account:", signer.address);

    const secureKYCDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecureKYC");
    console.log(`SecureKYC: ${secureKYCDeployment.address}`);

    const contract = await ethers.getContractAt("SecureKYC", secureKYCDeployment.address);

    const projectIdBytes32 = ethers.id(projectid);

    try {
      const transaction = await contract.generateProof(projectIdBytes32);
      await transaction.wait();

      console.log(`Proof generated for project: ${projectid}`);
      console.log("Transaction hash:", transaction.hash);
      console.log("Note: Proof is encrypted. Use frontend to access the encrypted proof.");
    } catch (error) {
      console.error("Error generating proof:", error);
    }
  });

task("authorize-verifier", "Authorize or deauthorize a KYC verifier")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("verifier", "Verifier address")
  .addParam("authorized", "true to authorize, false to deauthorize")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { verifier, authorized } = taskArguments;

    const [signer] = await ethers.getSigners();
    console.log("Managing verifier authorization with account:", signer.address);

    const secureKYCDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecureKYC");
    console.log(`SecureKYC: ${secureKYCDeployment.address}`);

    const contract = await ethers.getContractAt("SecureKYC", secureKYCDeployment.address);

    const isAuthorized = authorized.toLowerCase() === "true";

    const transaction = await contract.setAuthorizedVerifier(verifier, isAuthorized);
    await transaction.wait();

    console.log(`Verifier ${verifier} ${isAuthorized ? "authorized" : "deauthorized"}`);
    console.log("Transaction hash:", transaction.hash);
  });

task("get-verification-status", "Get verification status of a user")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("user", "User address")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { user } = taskArguments;

    const secureKYCDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecureKYC");
    console.log(`SecureKYC: ${secureKYCDeployment.address}`);

    const contract = await ethers.getContractAt("SecureKYC", secureKYCDeployment.address);

    const [verified, timestamp, verifier] = await contract.getVerificationStatus(user);

    console.log(`Verification status for ${user}:`);
    console.log("Verified:", verified);
    if (verified) {
      console.log("Verification timestamp:", new Date(Number(timestamp) * 1000).toISOString());
      console.log("Verified by:", verifier);
    }
  });

task("has-project-proof", "Check if user has proof for a project")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("user", "User address")
  .addParam("projectid", "Project identifier")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { user, projectid } = taskArguments;

    const secureKYCDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecureKYC");
    console.log(`SecureKYC: ${secureKYCDeployment.address}`);

    const contract = await ethers.getContractAt("SecureKYC", secureKYCDeployment.address);

    const projectIdBytes32 = ethers.id(projectid);
    const hasProof = await contract.hasProjectProof(user, projectIdBytes32);

    console.log(`User ${user} has proof for project "${projectid}": ${hasProof}`);
  });