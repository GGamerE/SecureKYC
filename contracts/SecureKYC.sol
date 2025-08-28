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
        bool isActive;
    }

    mapping(address => EncryptedKYCData) private userKYCData;
    mapping(address => bool) public authorizedVerifiers;
    mapping(address => bool) public projectRequirements;
    mapping(address => mapping(address => bool)) public userProjectEligibility;

    address public admin;

    mapping(address => mapping(address => ebool)) private checkEligibilityResults;

    event KYCVerified(address indexed user, address indexed verifier, uint256 timestamp);
    event VerifierAuthorized(address indexed verifier, bool authorized);
    event ProjectRequirementSet(address indexed projectAddress);
    event EligibilityChecked(address indexed user, address indexed projectAddress, bool eligible);

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
    /// @param projectAddress Address that will be allowed to check eligibility
    function setProjectRequirements(address projectAddress) external onlyAuthorizedVerifier {
        projectRequirements[projectAddress] = true;

        emit ProjectRequirementSet(projectAddress);
    }

    /// @notice Check if user meets project requirements without revealing specific data
    /// @param user Address of the user
    /// @param minAge Minimum age requirement
    /// @param allowedCountries Array of allowed country codes
    /// @param requiresPassport Whether passport verification is required
    function checkEligibility(
        address user,
        uint32 minAge,
        uint8[] calldata allowedCountries,
        bool requiresPassport
    ) external {
        if (!userKYCData[user].isVerified) {
            revert UserNotVerified();
        }

        if (!projectRequirements[msg.sender]) {
            revert InvalidInput();
        }

        // Use the stored encrypted KYC data directly
        EncryptedKYCData storage userData = userKYCData[user];

        FHE.allowTransient(userData.birthYear, address(this));
        FHE.allowTransient(userData.countryCode, address(this));

        // Check age requirement
        euint32 currentYear = FHE.asEuint32(uint32(block.timestamp / 365 days + 1970));
        euint32 userAge = FHE.sub(currentYear, userData.birthYear);
        euint32 requiredMinAge = FHE.asEuint32(minAge);
        ebool ageEligible = FHE.ge(userAge, requiredMinAge);

        // Check country requirement
        ebool countryEligible = FHE.asEbool(false);
        for (uint256 i = 0; i < allowedCountries.length; i++) {
            euint8 allowedCountry = FHE.asEuint8(allowedCountries[i]);
            ebool countryAllowed = FHE.eq(userData.countryCode, allowedCountry);
            countryEligible = FHE.or(countryEligible, countryAllowed);
        }

        // Check passport requirement
        ebool passportEligible = FHE.asEbool(userData.isVerified);
        if (!requiresPassport) {
            passportEligible = FHE.asEbool(true);
        }

        // Final eligibility check
        ebool eligible = FHE.and(FHE.and(ageEligible, countryEligible), passportEligible);

        FHE.allowThis(eligible);
        FHE.allow(eligible, msg.sender);

        checkEligibilityResults[msg.sender][user] = eligible;
    }

    function getCheckEligibilityResult(address project, address user) public view returns (ebool) {
        return checkEligibilityResults[project][user];
    }

    /// @notice Generate a proof of eligibility for a project
    /// @param projectAddress Address of the project
    /// @param minAge Minimum age requirement
    /// @param allowedCountries Array of allowed country codes
    /// @param requiresPassport Whether passport verification is required
    /// @return proof Encrypted proof of eligibility
    // function generateProof(
    //     address projectAddress,
    //     uint32 minAge,
    //     uint8[] calldata allowedCountries,
    //     bool requiresPassport
    // ) external returns (euint256 proof) {
    //     if (!projectRequirements[projectAddress]) {
    //         revert InvalidInput();
    //     }

    //     if (!userKYCData[msg.sender].isVerified) {
    //         revert UserNotVerified();
    //     }

    //     // Use the stored encrypted KYC data directly
    //     EncryptedKYCData storage userData = userKYCData[msg.sender];

    //     // Check age requirement
    //     euint32 currentYear = FHE.asEuint32(uint32(block.timestamp / 365 days + 1970));
    //     euint32 userAge = FHE.sub(currentYear, userData.birthYear);
    //     euint32 requiredMinAge = FHE.asEuint32(minAge);
    //     ebool ageEligible = FHE.ge(userAge, requiredMinAge);

    //     // Check country requirement
    //     ebool countryEligible = FHE.asEbool(false);
    //     for (uint256 i = 0; i < allowedCountries.length; i++) {
    //         euint8 allowedCountry = FHE.asEuint8(allowedCountries[i]);
    //         ebool countryAllowed = FHE.eq(userData.countryCode, allowedCountry);
    //         countryEligible = FHE.or(countryEligible, countryAllowed);
    //     }

    //     // Check passport requirement
    //     ebool passportEligible = FHE.asEbool(true);
    //     if (requiresPassport) {
    //         passportEligible = FHE.ne(userData.passportAddress, FHE.asEaddress(address(0)));
    //     }

    //     ebool eligible = FHE.and(FHE.and(ageEligible, countryEligible), passportEligible);

    //     euint256 proofValue = FHE.select(
    //         eligible,
    //         FHE.asEuint256(uint256(keccak256(abi.encodePacked(msg.sender, projectAddress, block.timestamp)))),
    //         FHE.asEuint256(0)
    //     );

    //     userProjectEligibility[msg.sender][projectAddress] = true;

    //     FHE.allowThis(proofValue);
    //     FHE.allow(proofValue, msg.sender);

    //     emit EligibilityChecked(msg.sender, projectAddress, true);

    //     return proofValue;
    // }

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
    /// @param projectAddress Address of the project
    /// @return hasProof Whether user has proof for the project
    function hasProjectProof(address user, address projectAddress) external view returns (bool hasProof) {
        return userProjectEligibility[user][projectAddress];
    }
}
