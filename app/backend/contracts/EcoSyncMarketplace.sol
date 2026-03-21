// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EcoSync Marketplace
 * @dev Decentralized P2P energy trading marketplace with EcoTokens
 * @notice This contract enables peer-to-peer energy trading with automated settlement
 */

contract EcoSyncMarketplace {
    
    // ============ State Variables ============
    
    string public constant name = "EcoToken";
    string public constant symbol = "ECO";
    uint8 public constant decimals = 18;
    
    uint256 public totalSupply;
    address public owner;
    bool public paused;
    
    // Energy trading parameters
    uint256 public constant MIN_TRADE_AMOUNT = 1;      // 1 kWh minimum
    uint256 public constant MAX_TRADE_AMOUNT = 10000;  // 10000 kWh maximum
    uint256 public platformFeePercent = 1;             // 1% platform fee
    
    // ============ Mappings ============
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Energy generation proofs (building => timestamp => energy amount)
    mapping(address => mapping(uint256 => uint256)) public generationProofs;
    
    // Trade history
    mapping(bytes32 => Trade) public trades;
    mapping(address => bytes32[]) public userTrades;
    
    // Verified energy oracles
    mapping(address => bool) public verifiedOracles;
    
    // ============ Structs ============
    
    struct Trade {
        bytes32 tradeId;
        address buyer;
        address seller;
        uint256 amount;      // Energy in kWh
        uint256 price;       // Price per kWh in wei
        uint256 totalCost;   // Total cost in wei
        uint256 timestamp;
        bool executed;
        bool verified;       // ZKP verification status
    }
    
    struct EnergyProof {
        address generator;
        uint256 timestamp;
        uint256 amount;
        bytes32 proofHash;   // ZKP hash
        bool verified;
    }
    
    // ============ Events ============
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TradeCreated(
        bytes32 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 price,
        uint256 totalCost
    );
    event TradeExecuted(
        bytes32 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 totalCost
    );
    event GenerationProofSubmitted(
        address indexed generator,
        uint256 timestamp,
        uint256 amount,
        bytes32 proofHash
    );
    event GenerationVerified(
        address indexed generator,
        uint256 timestamp,
        bool valid
    );
    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "EcoSync: Not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "EcoSync: Contract paused");
        _;
    }
    
    modifier onlyOracle() {
        require(verifiedOracles[msg.sender], "EcoSync: Not verified oracle");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(uint256 initialSupply) {
        owner = msg.sender;
        totalSupply = initialSupply * 10**decimals;
        balanceOf[msg.sender] = totalSupply;
        paused = false;
        
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    // ============ ERC20 Functions ============
    
    function transfer(address to, uint256 value) external whenNotPaused returns (bool) {
        require(to != address(0), "EcoSync: Invalid address");
        require(balanceOf[msg.sender] >= value, "EcoSync: Insufficient balance");
        
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) external whenNotPaused returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) external whenNotPaused returns (bool) {
        require(to != address(0), "EcoSync: Invalid address");
        require(balanceOf[from] >= value, "EcoSync: Insufficient balance");
        require(allowance[from][msg.sender] >= value, "EcoSync: Allowance exceeded");
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        
        emit Transfer(from, to, value);
        return true;
    }
    
    // ============ Energy Trading Functions ============
    
    /**
     * @dev Execute a P2P energy trade
     * @param buyer Address of the energy buyer
     * @param seller Address of the energy seller
     * @param amount Energy amount in kWh
     * @param price Price per kWh in EcoTokens (with decimals)
     * @return tradeId Unique identifier for the trade
     */
    function executeTrade(
        address buyer,
        address seller,
        uint256 amount,
        uint256 price
    ) external whenNotPaused returns (bytes32 tradeId) {
        require(buyer != address(0) && seller != address(0), "EcoSync: Invalid address");
        require(buyer != seller, "EcoSync: Self-trading not allowed");
        require(amount >= MIN_TRADE_AMOUNT && amount <= MAX_TRADE_AMOUNT, "EcoSync: Invalid amount");
        require(price > 0, "EcoSync: Invalid price");
        
        uint256 totalCost = amount * price;
        uint256 platformFee = (totalCost * platformFeePercent) / 100;
        uint256 sellerProceeds = totalCost - platformFee;
        
        require(balanceOf[buyer] >= totalCost, "EcoSync: Buyer insufficient balance");
        
        // Generate trade ID
        tradeId = keccak256(abi.encodePacked(
            buyer,
            seller,
            amount,
            price,
            block.timestamp,
            block.number
        ));
        
        // Create trade record
        trades[tradeId] = Trade({
            tradeId: tradeId,
            buyer: buyer,
            seller: seller,
            amount: amount,
            price: price,
            totalCost: totalCost,
            timestamp: block.timestamp,
            executed: false,
            verified: false
        });
        
        userTrades[buyer].push(tradeId);
        userTrades[seller].push(tradeId);
        
        emit TradeCreated(tradeId, buyer, seller, amount, price, totalCost);
        
        return tradeId;
    }
    
    /**
     * @dev Finalize a trade after verification
     * @param tradeId The trade to finalize
     * @param proofVerified Whether the ZKP verification passed
     */
    function finalizeTrade(bytes32 tradeId, bool proofVerified) external whenNotPaused onlyOracle {
        Trade storage trade = trades[tradeId];
        require(trade.tradeId != bytes32(0), "EcoSync: Trade not found");
        require(!trade.executed, "EcoSync: Trade already executed");
        
        trade.verified = proofVerified;
        
        if (proofVerified) {
            uint256 platformFee = (trade.totalCost * platformFeePercent) / 100;
            uint256 sellerProceeds = trade.totalCost - platformFee;
            
            // Transfer tokens
            balanceOf[trade.buyer] -= trade.totalCost;
            balanceOf[trade.seller] += sellerProceeds;
            balanceOf[owner] += platformFee;
            
            trade.executed = true;
            
            emit Transfer(trade.buyer, trade.seller, sellerProceeds);
            emit Transfer(trade.buyer, owner, platformFee);
        }
        
        emit TradeExecuted(tradeId, trade.buyer, trade.seller, trade.amount, trade.totalCost);
    }
    
    // ============ Zero-Knowledge Proof Functions ============
    
    /**
     * @dev Submit a proof of energy generation
     * @param timestamp When the energy was generated
     * @param amount Amount of energy in kWh
     * @param proofHash Hash of the ZKP
     */
    function submitGenerationProof(
        uint256 timestamp,
        uint256 amount,
        bytes32 proofHash
    ) external whenNotPaused {
        require(amount > 0, "EcoSync: Invalid amount");
        require(proofHash != bytes32(0), "EcoSync: Invalid proof");
        
        generationProofs[msg.sender][timestamp] = amount;
        
        emit GenerationProofSubmitted(msg.sender, timestamp, amount, proofHash);
    }
    
    /**
     * @dev Verify a generation proof (called by oracle)
     * @param generator Address of the energy generator
     * @param timestamp When the energy was generated
     * @param valid Whether the proof is valid
     */
    function verifyGeneration(
        address generator,
        uint256 timestamp,
        bool valid
    ) external onlyOracle {
        require(generationProofs[generator][timestamp] > 0, "EcoSync: Proof not found");
        
        emit GenerationVerified(generator, timestamp, valid);
    }
    
    // ============ Oracle Management ============
    
    function addOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "EcoSync: Invalid address");
        verifiedOracles[oracle] = true;
        emit OracleAdded(oracle);
    }
    
    function removeOracle(address oracle) external onlyOwner {
        verifiedOracles[oracle] = false;
        emit OracleRemoved(oracle);
    }
    
    // ============ Admin Functions ============
    
    function setPlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 10, "EcoSync: Fee too high");
        platformFeePercent = newFeePercent;
    }
    
    function pause() external onlyOwner {
        paused = true;
    }
    
    function unpause() external onlyOwner {
        paused = false;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "EcoSync: Invalid address");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    // ============ View Functions ============
    
    function getTrade(bytes32 tradeId) external view returns (Trade memory) {
        return trades[tradeId];
    }
    
    function getUserTrades(address user) external view returns (bytes32[] memory) {
        return userTrades[user];
    }
    
    function getGenerationProof(address generator, uint256 timestamp) external view returns (uint256) {
        return generationProofs[generator][timestamp];
    }
    
    function getTradeCount(address user) external view returns (uint256) {
        return userTrades[user].length;
    }
}
