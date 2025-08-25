// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    FHE,
    euint32,
    euint8,
    euint256,
    eaddress,
    externalEuint32,
    externalEuint8,
    externalEaddress,
    ebool
} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SecureKYC - A privacy-preserving KYC verification system
/// @notice This contract allows KYC providers to verify user credentials and issue encrypted proofs
/// @dev All KYC data is stored encrypted and can only be accessed by authorized parties
contract SecureKYC is SepoliaConfig {
    struct EncryptedKYCData {
        eaddress passportAddress;
        euint32 birthYear;
        euint8 countryCode;
        bool isVerified;
        uint256 verificationTimestamp;
        address verifiedBy;
    }

    struct KYCRequirement {
        uint32 minAge;
        uint8[] allowedCountries;
        bool requiresPassport;
        bool isActive;
    }

    mapping(address => EncryptedKYCData) private userKYCData;
    mapping(address => bool) public authorizedVerifiers;
    mapping(bytes32 => KYCRequirement) public projectRequirements;
    mapping(address => mapping(bytes32 => bool)) public userProjectEligibility;

    address public admin;

    event KYCVerified(address indexed user, address indexed verifier, uint256 timestamp);
    event VerifierAuthorized(address indexed verifier, bool authorized);
    event ProjectRequirementSet(bytes32 indexed projectId, uint32 minAge, bool requiresPassport);
    event EligibilityChecked(address indexed user, bytes32 indexed projectId, bool eligible);

    error UnauthorizedVerifier();
    error UserNotVerified();
    error InvalidInput();
    error OnlyAdmin();

    modifier onlyAuthorizedVerifier() {
        if (!authorizedVerifiers[msg.sender] && msg.sender != admin) {
            revert UnauthorizedVerifier();
        }
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert OnlyAdmin();
        }
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedVerifiers[msg.sender] = true;
    }

    /// @notice Submit KYC data for verification
    /// @param passportAddress Encrypted passport number as address
    /// @param birthYear Encrypted birth year
    /// @param countryCode Encrypted country code (1-255)
    /// @param inputProof Proof for the encrypted inputs
    function submitKYC(
        externalEaddress passportAddress,
        externalEuint32 birthYear,
        externalEuint8 countryCode,
        bytes calldata inputProof
    ) external {
        eaddress encryptedPassportAddress = FHE.fromExternal(passportAddress, inputProof);
        euint32 encryptedBirthYear = FHE.fromExternal(birthYear, inputProof);
        euint8 encryptedCountryCode = FHE.fromExternal(countryCode, inputProof);

        userKYCData[msg.sender] = EncryptedKYCData({
            passportAddress: encryptedPassportAddress,
            birthYear: encryptedBirthYear,
            countryCode: encryptedCountryCode,
            isVerified: false,
            verificationTimestamp: 0,
            verifiedBy: address(0)
        });

        FHE.allowThis(encryptedPassportAddress);
        FHE.allowThis(encryptedBirthYear);
        FHE.allowThis(encryptedCountryCode);

        FHE.allow(encryptedPassportAddress, msg.sender);
        FHE.allow(encryptedBirthYear, msg.sender);
        FHE.allow(encryptedCountryCode, msg.sender);
    }

    /// @notice Verify a user's KYC data (only authorized verifiers)
    /// @param user Address of the user to verify
    function verifyKYC(address user) external onlyAuthorizedVerifier {
        if (!FHE.isInitialized(userKYCData[user].passportAddress)) {
            revert InvalidInput();
        }

        userKYCData[user].isVerified = true;
        userKYCData[user].verificationTimestamp = block.timestamp;
        userKYCData[user].verifiedBy = msg.sender;

        emit KYCVerified(user, msg.sender, block.timestamp);
    }

    /// @notice Set requirements for a project
    /// @param projectId Unique identifier for the project
    /// @param minAge Minimum age requirement
    /// @param allowedCountries Array of allowed country codes
    /// @param requiresPassport Whether passport verification is required
    function setProjectRequirements(
        bytes32 projectId,
        uint32 minAge,
        uint8[] calldata allowedCountries,
        bool requiresPassport
    ) external onlyAuthorizedVerifier {
        projectRequirements[projectId] = KYCRequirement({
            minAge: minAge,
            allowedCountries: allowedCountries,
            requiresPassport: requiresPassport,
            isActive: true
        });

        emit ProjectRequirementSet(projectId, minAge, requiresPassport);
    }

    /// @notice Check if user meets project requirements without revealing specific data
    /// @param user Address of the user
    /// @param projectId Project identifier
    /// @return eligible Whether user is eligible (encrypted boolean)
    function checkEligibility(address user, bytes32 projectId) external returns (ebool eligible) {
        if (!userKYCData[user].isVerified) {
            revert UserNotVerified();
        }

        KYCRequirement memory requirements = projectRequirements[projectId];
        if (!requirements.isActive) {
            revert InvalidInput();
        }

        euint32 currentYear = FHE.asEuint32(uint32(block.timestamp / 365 days + 1970));
        euint32 userAge = FHE.sub(currentYear, userKYCData[user].birthYear);
        euint32 minAge = FHE.asEuint32(requirements.minAge);

        ebool ageEligible = FHE.ge(userAge, minAge);

        ebool countryEligible = FHE.asEbool(false);
        for (uint i = 0; i < requirements.allowedCountries.length; i++) {
            euint8 allowedCountry = FHE.asEuint8(requirements.allowedCountries[i]);
            ebool countryMatch = FHE.eq(userKYCData[user].countryCode, allowedCountry);
            countryEligible = FHE.or(countryEligible, countryMatch);
        }

        ebool passportEligible = FHE.asEbool(true);
        if (requirements.requiresPassport) {
            passportEligible = FHE.ne(userKYCData[user].passportAddress, FHE.asEaddress(address(0)));
        }

        eligible = FHE.and(FHE.and(ageEligible, countryEligible), passportEligible);

        FHE.allowThis(eligible);
        FHE.allow(eligible, msg.sender);
        FHE.allow(eligible, user);

        return eligible;
    }

    /// @notice Generate a proof of eligibility for a project
    /// @param projectId Project identifier
    /// @return proof Encrypted proof of eligibility
    function generateProof(bytes32 projectId) external returns (euint256 proof) {
        ebool eligible = this.checkEligibility(msg.sender, projectId);

        euint256 proofValue = FHE.select(
            eligible,
            FHE.asEuint256(uint256(keccak256(abi.encodePacked(msg.sender, projectId, block.timestamp)))),
            FHE.asEuint256(0)
        );

        userProjectEligibility[msg.sender][projectId] = true;

        FHE.allowThis(proofValue);
        FHE.allow(proofValue, msg.sender);

        emit EligibilityChecked(msg.sender, projectId, true);

        return proofValue;
    }

    /// @notice Authorize or deauthorize a KYC verifier
    /// @param verifier Address of the verifier
    /// @param authorized Whether to authorize or deauthorize
    function setAuthorizedVerifier(address verifier, bool authorized) external onlyAdmin {
        authorizedVerifiers[verifier] = authorized;
        emit VerifierAuthorized(verifier, authorized);
    }

    /// @notice Get user's encrypted KYC data
    /// @param user Address of the user
    /// @return passportAddress Encrypted passport address
    /// @return birthYear Encrypted birth year
    /// @return countryCode Encrypted country code
    function getUserKYCData(address user) external view returns (eaddress, euint32, euint8) {
        EncryptedKYCData memory data = userKYCData[user];
        return (data.passportAddress, data.birthYear, data.countryCode);
    }

    /// @notice Check if user is verified
    /// @param user Address of the user
    /// @return verified Whether user is verified
    /// @return timestamp Verification timestamp
    /// @return verifier Address of verifier
    function getVerificationStatus(
        address user
    ) external view returns (bool verified, uint256 timestamp, address verifier) {
        EncryptedKYCData memory data = userKYCData[user];
        return (data.isVerified, data.verificationTimestamp, data.verifiedBy);
    }

    /// @notice Check if user has generated proof for a project
    /// @param user Address of the user
    /// @param projectId Project identifier
    /// @return hasProof Whether user has proof for the project
    function hasProjectProof(address user, bytes32 projectId) external view returns (bool hasProof) {
        return userProjectEligibility[user][projectId];
    }
}
