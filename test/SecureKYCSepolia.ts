import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { SecureKYC } from "../types";
import { Signer } from "ethers";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("SecureKYC - Sepolia Integration", function () {
  let secureKYC: SecureKYC;
  let admin: Signer;
  let verifier: Signer;
  let user1: Signer;
  let adminAddress: string;
  let verifierAddress: string;
  let user1Address: string;

  before(async function () {
    // Skip tests if not on Sepolia
    if (process.env.HARDHAT_NETWORK !== "sepolia") {
      this.skip();
    }
  });

  beforeEach(async function () {
    [admin, verifier, user1] = await ethers.getSigners();
    adminAddress = await admin.getAddress();
    verifierAddress = await verifier.getAddress();
    user1Address = await user1.getAddress();

    // Deploy to Sepolia
    const SecureKYCFactory = await ethers.getContractFactory("SecureKYC");
    secureKYC = await SecureKYCFactory.deploy();
    await secureKYC.waitForDeployment();
    
    console.log("SecureKYC deployed to Sepolia at:", await secureKYC.getAddress());
  });

  describe("Full KYC Flow on Sepolia", function () {
    it("Should complete full KYC verification and proof generation flow", async function () {
      // Step 1: Authorize verifier
      await secureKYC.connect(admin).setAuthorizedVerifier(verifierAddress, true);
      console.log("✓ Verifier authorized");

      // Step 2: Set project requirements
      const projectId = ethers.id("SepoliaTestProject");
      await secureKYC.connect(verifier).setProjectRequirements(
        projectId,
        21, // minAge
        [1, 2, 3], // allowedCountries
        true // requiresPassport
      );
      console.log("✓ Project requirements set");

      // Step 3: Submit KYC data
      const passportHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes("SEPOLIA_PASSPORT_123")));
      const birthYear = 1990n;
      const countryCode = 1n;

      const input = fhevm.createEncryptedInput(
        await secureKYC.getAddress(),
        user1Address
      );
      input.add256(passportHash);
      input.add32(birthYear);
      input.add8(countryCode);

      const encryptedInput = await input.encrypt();
      
      await secureKYC.connect(user1).submitKYC(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.inputProof
      );
      console.log("✓ KYC data submitted");

      // Step 4: Verify KYC
      await secureKYC.connect(verifier).verifyKYC(user1Address);
      console.log("✓ KYC verified");

      // Verify verification status
      const [verified, timestamp, verifierAddr] = await secureKYC.getVerificationStatus(user1Address);
      expect(verified).to.be.true;
      expect(verifierAddr).to.equal(verifierAddress);
      console.log("✓ Verification status confirmed");

      // Step 5: Check eligibility (returns encrypted result)
      await secureKYC.connect(user1).checkEligibility(user1Address, projectId);
      console.log("✓ Eligibility checked");

      // Step 6: Generate proof
      await secureKYC.connect(user1).generateProof(projectId);
      console.log("✓ Proof generated");

      // Verify proof was generated
      const hasProof = await secureKYC.hasProjectProof(user1Address, projectId);
      expect(hasProof).to.be.true;
      console.log("✓ Proof generation confirmed");
    });

    it("Should decrypt user's encrypted KYC data on Sepolia", async function () {
      // Submit KYC data
      const passportHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes("DECRYPT_TEST_PASSPORT")));
      const birthYear = 2000n;
      const countryCode = 2n;

      const input = fhevm.createEncryptedInput(
        await secureKYC.getAddress(),
        user1Address
      );
      input.add256(passportHash);
      input.add32(birthYear);
      input.add8(countryCode);

      const encryptedInput = await input.encrypt();
      
      await secureKYC.connect(user1).submitKYC(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.inputProof
      );

      // Get encrypted data
      const [encPassport, encBirthYear, encCountryCode] = await secureKYC.getUserKYCData(user1Address);

      // Decrypt the data to verify it matches what we submitted
      const decryptedPassport = await fhevm.userDecryptEuint(
        FhevmType.euint256,
        encPassport,
        await secureKYC.getAddress(),
        user1
      );
      
      const decryptedBirthYear = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encBirthYear,
        await secureKYC.getAddress(),
        user1
      );
      
      const decryptedCountryCode = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encCountryCode,
        await secureKYC.getAddress(),
        user1
      );

      expect(decryptedPassport).to.equal(passportHash);
      expect(decryptedBirthYear).to.equal(birthYear);
      expect(decryptedCountryCode).to.equal(countryCode);
      
      console.log("✓ Decryption successful:");
      console.log("  Passport hash:", decryptedPassport.toString());
      console.log("  Birth year:", decryptedBirthYear.toString());
      console.log("  Country code:", decryptedCountryCode.toString());
    });

    it("Should handle eligibility with multiple countries on Sepolia", async function () {
      // Authorize verifier and submit KYC
      await secureKYC.connect(admin).setAuthorizedVerifier(verifierAddress, true);

      const passportHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes("MULTI_COUNTRY_TEST")));
      const birthYear = 1985n;
      const countryCode = 3n; // UK

      const input = fhevm.createEncryptedInput(
        await secureKYC.getAddress(),
        user1Address
      );
      input.add256(passportHash);
      input.add32(birthYear);
      input.add8(countryCode);

      const encryptedInput = await input.encrypt();
      
      await secureKYC.connect(user1).submitKYC(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.inputProof
      );

      await secureKYC.connect(verifier).verifyKYC(user1Address);

      // Set project requirements allowing UK (country code 3)
      const projectId = ethers.id("UKProject");
      await secureKYC.connect(verifier).setProjectRequirements(
        projectId,
        25, // minAge (user born 1985, should be ~39 years old)
        [3, 4, 5], // allowedCountries: UK and others
        true // requiresPassport
      );

      // Check eligibility and generate proof
      await secureKYC.connect(user1).checkEligibility(user1Address, projectId);
      await secureKYC.connect(user1).generateProof(projectId);

      const hasProof = await secureKYC.hasProjectProof(user1Address, projectId);
      expect(hasProof).to.be.true;
      console.log("✓ Multi-country eligibility check successful");
    });
  });

  describe("Gas Usage Analysis", function () {
    it("Should measure gas costs for key operations", async function () {
      await secureKYC.connect(admin).setAuthorizedVerifier(verifierAddress, true);

      // Measure KYC submission gas
      const passportHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes("GAS_TEST_PASSPORT")));
      const birthYear = 1990n;
      const countryCode = 1n;

      const input = fhevm.createEncryptedInput(
        await secureKYC.getAddress(),
        user1Address
      );
      input.add256(passportHash);
      input.add32(birthYear);
      input.add8(countryCode);

      const encryptedInput = await input.encrypt();
      
      const submitTx = await secureKYC.connect(user1).submitKYC(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.inputProof
      );
      const submitReceipt = await submitTx.wait();
      console.log("Gas used for KYC submission:", submitReceipt?.gasUsed.toString());

      // Measure KYC verification gas
      const verifyTx = await secureKYC.connect(verifier).verifyKYC(user1Address);
      const verifyReceipt = await verifyTx.wait();
      console.log("Gas used for KYC verification:", verifyReceipt?.gasUsed.toString());

      // Measure project requirements setting gas
      const projectId = ethers.id("GasTestProject");
      const requirementsTx = await secureKYC.connect(verifier).setProjectRequirements(
        projectId,
        21,
        [1, 2, 3],
        true
      );
      const requirementsReceipt = await requirementsTx.wait();
      console.log("Gas used for setting project requirements:", requirementsReceipt?.gasUsed.toString());

      // Measure proof generation gas
      const proofTx = await secureKYC.connect(user1).generateProof(projectId);
      const proofReceipt = await proofTx.wait();
      console.log("Gas used for proof generation:", proofReceipt?.gasUsed.toString());
    });
  });
});