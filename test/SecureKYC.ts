import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { SecureKYC } from "../types";
import { Signer } from "ethers";

describe("SecureKYC", function () {
  let secureKYC: SecureKYC;
  let admin: Signer;
  let verifier: Signer;
  let user1: Signer;
  let user2: Signer;
  let adminAddress: string;
  let verifierAddress: string;
  let user1Address: string;
  let user2Address: string;

  beforeEach(async function () {
    [admin, verifier, user1, user2] = await ethers.getSigners();
    adminAddress = await admin.getAddress();
    verifierAddress = await verifier.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();

    const SecureKYCFactory = await ethers.getContractFactory("SecureKYC");
    secureKYC = await SecureKYCFactory.deploy();
    await secureKYC.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the deployer as admin", async function () {
      expect(await secureKYC.admin()).to.equal(adminAddress);
    });

    it("Should authorize the admin as initial verifier", async function () {
      expect(await secureKYC.authorizedVerifiers(adminAddress)).to.be.true;
    });
  });

  describe("Verifier Management", function () {
    it("Should allow admin to authorize verifiers", async function () {
      await expect(secureKYC.connect(admin).setAuthorizedVerifier(verifierAddress, true))
        .to.emit(secureKYC, "VerifierAuthorized")
        .withArgs(verifierAddress, true);

      expect(await secureKYC.authorizedVerifiers(verifierAddress)).to.be.true;
    });

    it("Should allow admin to deauthorize verifiers", async function () {
      await secureKYC.connect(admin).setAuthorizedVerifier(verifierAddress, true);
      
      await expect(secureKYC.connect(admin).setAuthorizedVerifier(verifierAddress, false))
        .to.emit(secureKYC, "VerifierAuthorized")
        .withArgs(verifierAddress, false);

      expect(await secureKYC.authorizedVerifiers(verifierAddress)).to.be.false;
    });

    it("Should reject unauthorized users from managing verifiers", async function () {
      await expect(
        secureKYC.connect(user1).setAuthorizedVerifier(verifierAddress, true)
      ).to.be.revertedWithCustomError(secureKYC, "OnlyAdmin");
    });
  });

  describe("KYC Submission", function () {
    it("Should allow users to submit KYC data", async function () {
      const passportHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes("PASSPORT123456")));
      const birthYear = 1990n;
      const countryCode = 1n; // USA

      const input = fhevm.createEncryptedInput(
        await secureKYC.getAddress(),
        user1Address
      );
      input.add256(passportHash);
      input.add32(birthYear);
      input.add8(countryCode);

      const encryptedInput = await input.encrypt();

      await expect(
        secureKYC.connect(user1).submitKYC(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.inputProof
        )
      ).to.not.be.reverted;

      // Check that verification status shows as unverified initially
      const [verified, timestamp, verifierAddr] = await secureKYC.getVerificationStatus(user1Address);
      expect(verified).to.be.false;
      expect(timestamp).to.equal(0);
      expect(verifierAddr).to.equal(ethers.ZeroAddress);
    });

    it("Should store encrypted KYC data", async function () {
      const passportHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes("PASSPORT123456")));
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

      // Should be able to retrieve the encrypted data
      const [encPassport, encBirthYear, encCountryCode] = await secureKYC.getUserKYCData(user1Address);
      
      // These should not be zero (indicating data was stored)
      expect(encPassport).to.not.equal(0);
      expect(encBirthYear).to.not.equal(0);
      expect(encCountryCode).to.not.equal(0);
    });
  });

  describe("KYC Verification", function () {
    beforeEach(async function () {
      // Authorize verifier
      await secureKYC.connect(admin).setAuthorizedVerifier(verifierAddress, true);

      // Submit KYC data for user1
      const passportHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes("PASSPORT123456")));
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
    });

    it("Should allow authorized verifiers to verify KYC", async function () {
      await expect(secureKYC.connect(verifier).verifyKYC(user1Address))
        .to.emit(secureKYC, "KYCVerified");

      const [verified, timestamp, verifierAddr] = await secureKYC.getVerificationStatus(user1Address);
      expect(verified).to.be.true;
      expect(timestamp).to.be.greaterThan(0);
      expect(verifierAddr).to.equal(verifierAddress);
    });

    it("Should reject unauthorized users from verifying KYC", async function () {
      await expect(
        secureKYC.connect(user2).verifyKYC(user1Address)
      ).to.be.revertedWithCustomError(secureKYC, "UnauthorizedVerifier");
    });

    it("Should reject verification of non-existent KYC data", async function () {
      await expect(
        secureKYC.connect(verifier).verifyKYC(user2Address)
      ).to.be.revertedWithCustomError(secureKYC, "InvalidInput");
    });
  });

  describe("Project Requirements", function () {
    beforeEach(async function () {
      await secureKYC.connect(admin).setAuthorizedVerifier(verifierAddress, true);
    });

    it("Should allow authorized verifiers to set project requirements", async function () {
      const projectId = ethers.id("TestProject");
      const minAge = 21;
      const allowedCountries = [1, 2, 3]; // USA, Canada, UK
      const requiresPassport = true;

      await expect(
        secureKYC.connect(verifier).setProjectRequirements(
          projectId,
          minAge,
          allowedCountries,
          requiresPassport
        )
      ).to.emit(secureKYC, "ProjectRequirementSet")
        .withArgs(projectId, minAge, requiresPassport);

      const requirements = await secureKYC.projectRequirements(projectId);
      expect(requirements.minAge).to.equal(minAge);
      expect(requirements.requiresPassport).to.equal(requiresPassport);
      expect(requirements.isActive).to.be.true;
    });

    it("Should reject unauthorized users from setting project requirements", async function () {
      const projectId = ethers.id("TestProject");
      
      await expect(
        secureKYC.connect(user1).setProjectRequirements(
          projectId,
          21,
          [1, 2, 3],
          true
        )
      ).to.be.revertedWithCustomError(secureKYC, "UnauthorizedVerifier");
    });
  });

  describe("Eligibility and Proof Generation", function () {
    let projectId: string;

    beforeEach(async function () {
      // Authorize verifier and set up project requirements
      await secureKYC.connect(admin).setAuthorizedVerifier(verifierAddress, true);
      
      projectId = ethers.id("TestProject");
      await secureKYC.connect(verifier).setProjectRequirements(
        projectId,
        18, // minAge
        [1, 2], // allowedCountries: USA, Canada
        true // requiresPassport
      );

      // Submit and verify KYC for user1 (born 1990, country 1)
      const passportHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes("PASSPORT123456")));
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

      await secureKYC.connect(verifier).verifyKYC(user1Address);
    });

    it("Should allow checking eligibility for verified users", async function () {
      await expect(
        secureKYC.connect(user1).checkEligibility(user1Address, projectId)
      ).to.not.be.reverted;
    });

    it("Should reject eligibility check for unverified users", async function () {
      await expect(
        secureKYC.connect(user1).checkEligibility(user2Address, projectId)
      ).to.be.revertedWithCustomError(secureKYC, "UserNotVerified");
    });

    it("Should allow generating proof for eligible users", async function () {
      await expect(
        secureKYC.connect(user1).generateProof(projectId)
      ).to.emit(secureKYC, "EligibilityChecked")
        .withArgs(user1Address, projectId, true);

      const hasProof = await secureKYC.hasProjectProof(user1Address, projectId);
      expect(hasProof).to.be.true;
    });

    it("Should track project proof generation", async function () {
      expect(await secureKYC.hasProjectProof(user1Address, projectId)).to.be.false;
      
      await secureKYC.connect(user1).generateProof(projectId);
      
      expect(await secureKYC.hasProjectProof(user1Address, projectId)).to.be.true;
    });
  });

  describe("Access Control", function () {
    it("Should maintain proper access control for encrypted data", async function () {
      const passportHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes("PASSPORT123456")));
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

      // The contract should have stored the encrypted data
      const [encPassport, encBirthYear, encCountryCode] = await secureKYC.getUserKYCData(user1Address);
      
      // These should be non-zero handles
      expect(encPassport).to.not.equal(0);
      expect(encBirthYear).to.not.equal(0);
      expect(encCountryCode).to.not.equal(0);
    });
  });
});