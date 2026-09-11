// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TraceHarvest
 * @notice Tracks a food batch through Farmer -> Distributor -> Vendor -> Canteen
 *         Every stage update is an immutable on-chain event.
 */
contract TraceHarvest {
    enum Stage {
        Registered,   // Farmer created the batch
        InTransit,    // Distributor picked it up / is transporting it
        AtVendor,     // Campus vendor received it
        Delivered     // Canteen/hostel confirmed final receipt
    }

    struct StageRecord {
        Stage stage;
        address actor;
        string note;        // e.g. "Picked up from Farm A, temp 4C"
        string ipfsHash;    // optional certificate / photo / doc on IPFS
        uint256 timestamp;
    }

    struct Batch {
        uint256 id;
        string cropName;
        address farmer;
        string farmerName;
        string originIpfsHash; // e.g. organic certificate
        uint256 createdAt;
        Stage currentStage;
        bool exists;
    }

    uint256 private nextBatchId = 1;

    mapping(uint256 => Batch) public batches;
    mapping(uint256 => StageRecord[]) private batchHistory;

    // Simple role registry so only known actors can push updates.
    // In production, replace with OpenZeppelin AccessControl.
    mapping(address => bool) public isFarmer;
    mapping(address => bool) public isDistributor;
    mapping(address => bool) public isVendor;
    mapping(address => bool) public isCanteen;

    address public admin;

    event BatchRegistered(uint256 indexed batchId, address indexed farmer, string cropName);
    event StageUpdated(uint256 indexed batchId, Stage stage, address indexed actor, string note);
    event RoleGranted(address indexed account, string role);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // ---------- Role management (admin only, MVP-level) ----------

    function grantFarmer(address account) external onlyAdmin {
        isFarmer[account] = true;
        emit RoleGranted(account, "farmer");
    }

    function grantDistributor(address account) external onlyAdmin {
        isDistributor[account] = true;
        emit RoleGranted(account, "distributor");
    }

    function grantVendor(address account) external onlyAdmin {
        isVendor[account] = true;
        emit RoleGranted(account, "vendor");
    }

    function grantCanteen(address account) external onlyAdmin {
        isCanteen[account] = true;
        emit RoleGranted(account, "canteen");
    }

    // ---------- Core workflow ----------

    /// @notice Farmer registers a new crop batch.
    function registerBatch(
        string calldata cropName,
        string calldata farmerName,
        string calldata originIpfsHash
    ) external returns (uint256) {
        require(isFarmer[msg.sender], "Caller is not a registered farmer");

        uint256 batchId = nextBatchId++;
        batches[batchId] = Batch({
            id: batchId,
            cropName: cropName,
            farmer: msg.sender,
            farmerName: farmerName,
            originIpfsHash: originIpfsHash,
            createdAt: block.timestamp,
            currentStage: Stage.Registered,
            exists: true
        });

        batchHistory[batchId].push(StageRecord({
            stage: Stage.Registered,
            actor: msg.sender,
            note: "Batch registered by farmer",
            ipfsHash: originIpfsHash,
            timestamp: block.timestamp
        }));

        emit BatchRegistered(batchId, msg.sender, cropName);
        return batchId;
    }

    /// @notice Distributor marks the batch as picked up / in transit.
    function markInTransit(uint256 batchId, string calldata note, string calldata ipfsHash) external {
        require(isDistributor[msg.sender], "Caller is not a registered distributor");
        _advanceStage(batchId, Stage.InTransit, note, ipfsHash);
    }

    /// @notice Campus vendor confirms the batch arrived at campus.
    function markAtVendor(uint256 batchId, string calldata note, string calldata ipfsHash) external {
        require(isVendor[msg.sender], "Caller is not a registered vendor");
        _advanceStage(batchId, Stage.AtVendor, note, ipfsHash);
    }

    /// @notice Hostel/canteen confirms final receipt.
    function confirmDelivery(uint256 batchId, string calldata note, string calldata ipfsHash) external {
        require(isCanteen[msg.sender], "Caller is not a registered canteen");
        _advanceStage(batchId, Stage.Delivered, note, ipfsHash);
    }

    function _advanceStage(
        uint256 batchId,
        Stage newStage,
        string calldata note,
        string calldata ipfsHash
    ) internal {
        Batch storage b = batches[batchId];
        require(b.exists, "Batch does not exist");
        require(uint8(newStage) == uint8(b.currentStage) + 1, "Stages must advance in order");

        b.currentStage = newStage;
        batchHistory[batchId].push(StageRecord({
            stage: newStage,
            actor: msg.sender,
            note: note,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp
        }));

        emit StageUpdated(batchId, newStage, msg.sender, note);
    }

    // ---------- Read functions (what the QR-scan page calls) ----------

    function getBatch(uint256 batchId) external view returns (Batch memory) {
        require(batches[batchId].exists, "Batch does not exist");
        return batches[batchId];
    }

    function getHistory(uint256 batchId) external view returns (StageRecord[] memory) {
        require(batches[batchId].exists, "Batch does not exist");
        return batchHistory[batchId];
    }

    function totalBatches() external view returns (uint256) {
        return nextBatchId - 1;
    }
}
