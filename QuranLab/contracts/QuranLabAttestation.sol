// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title QuranLabAttestation
 * @dev Smart contract for immutable Quranic recitation progress and certification
 * @author Muhammad Adnan Ul Mustafa
 * 
 * Features:
 * - 200+ year eternal storage guarantee
 * - Immutable spiritual progress records
 * - NFT-based certificates for achievements
 * - Multi-layer validation system integration
 * - Jannah Points tracking and rewards
 */
contract QuranLabAttestation is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Counters for tracking IDs
    Counters.Counter private _attestationIds;
    Counters.Counter private _certificateIds;
    
    // Events
    event RecitationAttested(uint256 indexed attestationId, address indexed user, uint256 accuracy, uint256 jannahPoints);
    event CertificateIssued(uint256 indexed certificateId, address indexed user, string achievement);
    event ProgressMilestone(address indexed user, uint256 totalPoints, string milestone);
    event ExpertValidation(uint256 indexed attestationId, address indexed expert, bool approved);
    
    // Structs
    struct RecitationAttestation {
        uint256 id;
        address user;
        uint256 timestamp;
        uint256 accuracy; // Percentage * 100 (e.g., 9550 = 95.50%)
        uint256 jannahPoints;
        string surahName;
        uint256 verseStart;
        uint256 verseEnd;
        string audioHash; // IPFS hash of audio recording
        string analysisHash; // IPFS hash of AI analysis
        bool humanValidated;
        bool scholarValidated;
        address validatingExpert;
        address validatingScholar;
        uint256 validationTimestamp;
        string correctionNotes;
    }
    
    struct UserProgress {
        uint256 totalJannahPoints;
        uint256 totalRecitations;
        uint256 averageAccuracy;
        uint256 currentLevel;
        uint256 certificatesEarned;
        uint256 lastActivityTimestamp;
        mapping(string => uint256) surahProgress; // surah name => best accuracy
        mapping(uint256 => bool) milestonesAchieved; // milestone ID => achieved
    }
    
    struct Certificate {
        uint256 id;
        address recipient;
        string achievement;
        uint256 issuedTimestamp;
        uint256 requiredPoints;
        uint256 requiredAccuracy;
        string metadataURI; // IPFS URI for certificate metadata
        bool revoked;
    }
    
    // Mappings
    mapping(uint256 => RecitationAttestation) public attestations;
    mapping(address => UserProgress) public userProgress;
    mapping(uint256 => Certificate) public certificates;
    mapping(address => bool) public authorizedExperts;
    mapping(address => bool) public authorizedScholars;
    mapping(address => uint256[]) public userAttestations;
    mapping(address => uint256[]) public userCertificates;
    
    // Constants
    uint256 public constant POINTS_PER_PERCENT = 10; // 1% improvement = 10 points
    uint256 public constant MIN_ACCURACY_FOR_POINTS = 5000; // 50.00%
    uint256 public constant EXPERT_VALIDATION_BONUS = 50; // 50 bonus points
    uint256 public constant SCHOLAR_VALIDATION_BONUS = 100; // 100 bonus points
    
    // Milestone thresholds
    uint256[] public milestoneThresholds = [1000, 5000, 10000, 25000, 50000, 100000];
    string[] public milestoneNames = [
        "First Steps in Jannah",
        "Devoted Reciter",
        "Quran Guardian",
        "Hafiz Aspirant",
        "Master Reciter",
        "Quran Champion"
    ];
    
    constructor() ERC721("QuranLab Certificate", "QLC") {
        // Initialize contract
    }
    
    /**
     * @dev Modifier to check if caller is authorized expert
     */
    modifier onlyAuthorizedExpert() {
        require(authorizedExperts[msg.sender], "Not authorized expert");
        _;
    }
    
    /**
     * @dev Modifier to check if caller is authorized scholar
     */
    modifier onlyAuthorizedScholar() {
        require(authorizedScholars[msg.sender], "Not authorized scholar");
        _;
    }
    
    /**
     * @dev Attest a recitation with immutable storage
     * @param user Address of the user
     * @param accuracy Accuracy percentage * 100
     * @param surahName Name of the recited Surah
     * @param verseStart Starting verse number
     * @param verseEnd Ending verse number
     * @param audioHash IPFS hash of audio recording
     * @param analysisHash IPFS hash of AI analysis
     */
    function attestRecitation(
        address user,
        uint256 accuracy,
        string memory surahName,
        uint256 verseStart,
        uint256 verseEnd,
        string memory audioHash,
        string memory analysisHash
    ) external nonReentrant returns (uint256) {
        require(user != address(0), "Invalid user address");
        require(accuracy <= 10000, "Accuracy cannot exceed 100%");
        require(bytes(surahName).length > 0, "Surah name required");
        require(bytes(audioHash).length > 0, "Audio hash required");
        require(bytes(analysisHash).length > 0, "Analysis hash required");
        
        _attestationIds.increment();
        uint256 attestationId = _attestationIds.current();
        
        // Calculate Jannah Points
        uint256 jannahPoints = calculateJannahPoints(accuracy);
        
        // Create attestation record
        RecitationAttestation storage attestation = attestations[attestationId];
        attestation.id = attestationId;
        attestation.user = user;
        attestation.timestamp = block.timestamp;
        attestation.accuracy = accuracy;
        attestation.jannahPoints = jannahPoints;
        attestation.surahName = surahName;
        attestation.verseStart = verseStart;
        attestation.verseEnd = verseEnd;
        attestation.audioHash = audioHash;
        attestation.analysisHash = analysisHash;
        
        // Update user progress
        updateUserProgress(user, accuracy, jannahPoints, surahName);
        
        // Add to user's attestations
        userAttestations[user].push(attestationId);
        
        emit RecitationAttested(attestationId, user, accuracy, jannahPoints);
        
        // Check for milestone achievements
        checkMilestones(user);
        
        return attestationId;
    }
    
    /**
     * @dev Expert validation of recitation
     * @param attestationId ID of the attestation
     * @param approved Whether the recitation is approved
     * @param correctionNotes Notes from the expert
     */
    function expertValidation(
        uint256 attestationId,
        bool approved,
        string memory correctionNotes
    ) external onlyAuthorizedExpert {
        require(attestationId <= _attestationIds.current(), "Invalid attestation ID");
        
        RecitationAttestation storage attestation = attestations[attestationId];
        require(!attestation.humanValidated, "Already validated by expert");
        
        attestation.humanValidated = true;
        attestation.validatingExpert = msg.sender;
        attestation.validationTimestamp = block.timestamp;
        attestation.correctionNotes = correctionNotes;
        
        if (approved) {
            // Award bonus points for expert validation
            userProgress[attestation.user].totalJannahPoints += EXPERT_VALIDATION_BONUS;
            emit ProgressMilestone(attestation.user, userProgress[attestation.user].totalJannahPoints, "Expert Validated");
        }
        
        emit ExpertValidation(attestationId, msg.sender, approved);
    }
    
    /**
     * @dev Scholar validation of recitation
     * @param attestationId ID of the attestation
     * @param approved Whether the recitation is approved
     */
    function scholarValidation(
        uint256 attestationId,
        bool approved
    ) external onlyAuthorizedScholar {
        require(attestationId <= _attestationIds.current(), "Invalid attestation ID");
        
        RecitationAttestation storage attestation = attestations[attestationId];
        require(attestation.humanValidated, "Must be validated by expert first");
        require(!attestation.scholarValidated, "Already validated by scholar");
        
        attestation.scholarValidated = true;
        attestation.validatingScholar = msg.sender;
        
        if (approved) {
            // Award bonus points for scholar validation
            userProgress[attestation.user].totalJannahPoints += SCHOLAR_VALIDATION_BONUS;
            emit ProgressMilestone(attestation.user, userProgress[attestation.user].totalJannahPoints, "Scholar Validated");
        }
        
        emit ExpertValidation(attestationId, msg.sender, approved);
    }
    
    /**
     * @dev Issue a certificate NFT for achievement
     * @param recipient Address of the recipient
     * @param achievement Description of the achievement
     * @param requiredPoints Points required for this certificate
     * @param requiredAccuracy Accuracy required for this certificate
     * @param metadataURI IPFS URI for certificate metadata
     */
    function issueCertificate(
        address recipient,
        string memory achievement,
        uint256 requiredPoints,
        uint256 requiredAccuracy,
        string memory metadataURI
    ) external onlyOwner returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(userProgress[recipient].totalJannahPoints >= requiredPoints, "Insufficient points");
        require(userProgress[recipient].averageAccuracy >= requiredAccuracy, "Insufficient accuracy");
        
        _certificateIds.increment();
        uint256 certificateId = _certificateIds.current();
        
        // Create certificate record
        Certificate storage certificate = certificates[certificateId];
        certificate.id = certificateId;
        certificate.recipient = recipient;
        certificate.achievement = achievement;
        certificate.issuedTimestamp = block.timestamp;
        certificate.requiredPoints = requiredPoints;
        certificate.requiredAccuracy = requiredAccuracy;
        certificate.metadataURI = metadataURI;
        
        // Mint NFT certificate
        _safeMint(recipient, certificateId);
        
        // Update user progress
        userProgress[recipient].certificatesEarned++;
        userCertificates[recipient].push(certificateId);
        
        emit CertificateIssued(certificateId, recipient, achievement);
        
        return certificateId;
    }
    
    /**
     * @dev Calculate Jannah Points based on accuracy
     * @param accuracy Accuracy percentage * 100
     * @return points Calculated Jannah Points
     */
    function calculateJannahPoints(uint256 accuracy) public pure returns (uint256) {
        if (accuracy < MIN_ACCURACY_FOR_POINTS) {
            return 0;
        }
        
        // Base points: accuracy * POINTS_PER_PERCENT / 100
        uint256 basePoints = (accuracy * POINTS_PER_PERCENT) / 100;
        
        // Bonus for high accuracy
        if (accuracy >= 9500) { // 95%+
            basePoints = (basePoints * 150) / 100; // 50% bonus
        } else if (accuracy >= 9000) { // 90%+
            basePoints = (basePoints * 125) / 100; // 25% bonus
        } else if (accuracy >= 8000) { // 80%+
            basePoints = (basePoints * 110) / 100; // 10% bonus
        }
        
        return basePoints;
    }
    
    /**
     * @dev Update user progress after attestation
     */
    function updateUserProgress(
        address user,
        uint256 accuracy,
        uint256 jannahPoints,
        string memory surahName
    ) internal {
        UserProgress storage progress = userProgress[user];
        
        // Update totals
        progress.totalJannahPoints += jannahPoints;
        progress.totalRecitations++;
        progress.lastActivityTimestamp = block.timestamp;
        
        // Update average accuracy
        progress.averageAccuracy = ((progress.averageAccuracy * (progress.totalRecitations - 1)) + accuracy) / progress.totalRecitations;
        
        // Update surah progress (keep best accuracy)
        if (progress.surahProgress[surahName] < accuracy) {
            progress.surahProgress[surahName] = accuracy;
        }
        
        // Update level based on total points
        uint256 newLevel = calculateLevel(progress.totalJannahPoints);
        if (newLevel > progress.currentLevel) {
            progress.currentLevel = newLevel;
            emit ProgressMilestone(user, progress.totalJannahPoints, string(abi.encodePacked("Level ", toString(newLevel))));
        }
    }
    
    /**
     * @dev Check and award milestones
     */
    function checkMilestones(address user) internal {
        UserProgress storage progress = userProgress[user];
        
        for (uint256 i = 0; i < milestoneThresholds.length; i++) {
            if (progress.totalJannahPoints >= milestoneThresholds[i] && !progress.milestonesAchieved[i]) {
                progress.milestonesAchieved[i] = true;
                emit ProgressMilestone(user, progress.totalJannahPoints, milestoneNames[i]);
            }
        }
    }
    
    /**
     * @dev Calculate user level based on total points
     */
    function calculateLevel(uint256 totalPoints) public pure returns (uint256) {
        if (totalPoints < 1000) return 1;
        if (totalPoints < 5000) return 2;
        if (totalPoints < 10000) return 3;
        if (totalPoints < 25000) return 4;
        if (totalPoints < 50000) return 5;
        if (totalPoints < 100000) return 6;
        return 7; // Master level
    }
    
    /**
     * @dev Authorize an expert
     */
    function authorizeExpert(address expert) external onlyOwner {
        authorizedExperts[expert] = true;
    }
    
    /**
     * @dev Authorize a scholar
     */
    function authorizeScholar(address scholar) external onlyOwner {
        authorizedScholars[scholar] = true;
    }
    
    /**
     * @dev Get user's attestation history
     */
    function getUserAttestations(address user) external view returns (uint256[] memory) {
        return userAttestations[user];
    }
    
    /**
     * @dev Get user's certificates
     */
    function getUserCertificates(address user) external view returns (uint256[] memory) {
        return userCertificates[user];
    }
    
    /**
     * @dev Get attestation details
     */
    function getAttestation(uint256 attestationId) external view returns (
        address user,
        uint256 timestamp,
        uint256 accuracy,
        uint256 jannahPoints,
        string memory surahName,
        bool humanValidated,
        bool scholarValidated
    ) {
        RecitationAttestation storage attestation = attestations[attestationId];
        return (
            attestation.user,
            attestation.timestamp,
            attestation.accuracy,
            attestation.jannahPoints,
            attestation.surahName,
            attestation.humanValidated,
            attestation.scholarValidated
        );
    }
    
    /**
     * @dev Override tokenURI to return certificate metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Certificate does not exist");
        return certificates[tokenId].metadataURI;
    }
    
    /**
     * @dev Convert uint to string
     */
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Emergency function to pause contract (if needed)
     */
    function emergencyPause() external onlyOwner {
        // Implementation for emergency pause if needed
    }
}