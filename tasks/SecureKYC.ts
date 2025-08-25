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

    // Convert passport number to address format (reversible method)
    // Passport numbers are typically alphanumeric and < 20 chars
    const passportBytes = ethers.toUtf8Bytes(passport);

    if (passportBytes.length > 20) {
      throw new Error("Passport number too long (max 20 characters)");
    }

    // Pad to 20 bytes (address length) with zeros
    const paddedBytes = new Uint8Array(20);
    paddedBytes.set(passportBytes);

    // Convert to address format
    const passportAddress = ethers.hexlify(paddedBytes);

    console.log("Passport number:", passport);
    console.log("Passport converted to address:", passportAddress);

    // Test reverse conversion for verification
    const reversedPassport = ethers.toUtf8String(passportAddress).replace(/\0+$/, '');
    console.log("Reverse conversion test:", reversedPassport);

    if (reversedPassport !== passport) {
      throw new Error("Passport conversion failed verification");
    }

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

// Utility functions for passport <-> address conversion
function passportToAddress(passport: string): string {
  const { ethers } = require("hardhat");

  const passportBytes = ethers.toUtf8Bytes(passport);

  if (passportBytes.length > 20) {
    throw new Error("Passport number too long (max 20 characters)");
  }

  // Pad to 20 bytes with zeros
  const paddedBytes = new Uint8Array(20);
  paddedBytes.set(passportBytes);

  return ethers.hexlify(paddedBytes);
}

function addressToPassport(address: string): string {
  const { ethers } = require("hardhat");

  // Remove null bytes and convert back to string
  return ethers.toUtf8String(address).replace(/\0+$/, '');
}

task("test-passport-conversion", "Test bidirectional passport <-> address conversion")
  .addParam("passport", "Passport number to test conversion")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { passport } = taskArguments;

    console.log("=== Testing Bidirectional Passport Conversion ===");
    console.log("Original passport:", passport);

    try {
      // Convert passport to address
      const address = passportToAddress(passport);
      console.log("Converted to address:", address);

      // Convert address back to passport
      const reversedPassport = addressToPassport(address);
      console.log("Converted back to passport:", reversedPassport);

      // Verify conversion
      const isCorrect = reversedPassport === passport;
      console.log("Conversion successful:", isCorrect);

      if (!isCorrect) {
        console.error("ERROR: Conversion failed!");
        console.error(`Expected: "${passport}"`);
        console.error(`Got: "${reversedPassport}"`);
      } else {
        console.log("✅ Bidirectional conversion working correctly!");
      }

    } catch (error) {
      console.error("Conversion failed:", error);
    }
  });

task("get-user-kyc-data", "Get user's encrypted KYC data and decrypt it")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("user", "User address to get KYC data for")
  .setAction(async function (taskArguments: TaskArguments, { ethers, fhevm, deployments }) {
    const { user } = taskArguments;
    await fhevm.initializeCLIApi();

    const [signer] = await ethers.getSigners();
    console.log("Getting KYC data with account:", signer.address);

    const secureKYCDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SecureKYC");
    console.log(`SecureKYC: ${secureKYCDeployment.address}`);

    const contract = await ethers.getContractAt("SecureKYC", secureKYCDeployment.address);

    try {
      console.log(`Getting encrypted KYC data for user: ${user}`);

      // Get encrypted KYC data from contract
      const [encryptedPassportAddress, encryptedBirthYear, encryptedCountryCode] = await contract.getUserKYCData(user);

      console.log("Encrypted data retrieved:");
      console.log("- Passport address (encrypted):", encryptedPassportAddress);
      console.log("- Birth year (encrypted):", encryptedBirthYear);
      console.log("- Country code (encrypted):", encryptedCountryCode);

      // Try to decrypt the data (user must have permission)
      console.log("\nAttempting to decrypt data...");

      try {
        // Import FhevmType for proper type specification
        const { FhevmType } = require("@fhevm/hardhat-plugin");

        // Decrypt passport address (eaddress type)
        const decryptedPassportAddress = await fhevm.userDecryptEaddress(
          encryptedPassportAddress,
          secureKYCDeployment.address,
          signer
        );

        // Convert address back to passport number
        const passportNumber = addressToPassport(decryptedPassportAddress);

        console.log("✅ Decrypted passport address:", decryptedPassportAddress);
        console.log("✅ Converted to passport number:", passportNumber);

        // Decrypt birth year (euint32 type)
        const decryptedBirthYear = await fhevm.userDecryptEuint(
          FhevmType.euint32,
          encryptedBirthYear,
          secureKYCDeployment.address,
          signer
        );
        console.log("✅ Decrypted birth year:", Number(decryptedBirthYear));

        // Decrypt country code (euint8 type)
        const decryptedCountryCode = await fhevm.userDecryptEuint(
          FhevmType.euint8,
          encryptedCountryCode,
          secureKYCDeployment.address,
          signer
        );
        console.log("✅ Decrypted country code:", Number(decryptedCountryCode));

        console.log("\n=== Complete KYC Information ===");
        console.log("Passport Number:", passportNumber || "Unable to convert");
        console.log("Birth Year:", Number(decryptedBirthYear));
        console.log("Country Code:", Number(decryptedCountryCode));

      } catch (decryptError) {
        console.log("❌ Decryption failed - user may not have permission to decrypt this data");
        console.log("Error:", decryptError);
        console.log("\nNote: Only the data owner or authorized parties can decrypt KYC data");
      }

    } catch (error) {
      console.error("Error getting KYC data:", error);
    }
  });

task("test-kyc-flow", "Test complete KYC flow: submit → verify → read")
  .addOptionalParam("address", "Optionally specify the SecureKYC contract address")
  .addParam("passport", "Passport number for testing")
  .addParam("birthyear", "Birth year for testing")
  .addParam("country", "Country code for testing")
  .setAction(async function (taskArguments: TaskArguments, { ethers, run }) {
    const { passport, birthyear, country } = taskArguments;

    console.log("=== Testing Complete KYC Flow ===");
    console.log("Passport:", passport);
    console.log("Birth Year:", birthyear);
    console.log("Country Code:", country);

    const [signer] = await ethers.getSigners();
    const userAddress = signer.address;

    try {
      console.log("\n1. Submitting KYC data...");
      await run("submit-kyc", {
        passport,
        birthyear,
        country,
        address: taskArguments.address
      });

      console.log("\n2. Verifying KYC data...");
      await run("verify-kyc", {
        user: userAddress,
        address: taskArguments.address
      });

      console.log("\n3. Reading back KYC data...");
      await run("get-user-kyc-data", {
        user: userAddress,
        address: taskArguments.address
      });

      console.log("\n✅ Complete KYC flow test completed successfully!");

    } catch (error) {
      console.error("❌ KYC flow test failed:", error);
    }
  });