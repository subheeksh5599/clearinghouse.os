// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SatelliteVault
 * @notice Per-chain satellite contract for ClearingHouse.OS.
 *         Holds treasury funds, enforces state locks during cross-chain
 *         rebalancing, and provides a time-locked multi-sig emergency
 *         escape hatch if the shared sequencer stalls.
 *
 *         Deployed to: Base Sepolia Testnet
 *         Verify on:   https://sepolia.basescan.org/address/{DEPLOYED_ADDRESS}#code
 */
contract SatelliteVault {
    // ── Errors ──────────────────────────────────────────────────
    error WalletLocked(address wallet);
    error ReentrancyGuardActive(address wallet);
    error InsufficientBalance(address wallet, uint256 requested, uint256 available);
    error NotMaster();
    error NotMultiSigSigner(address signer);
    error EscapeHatchTimeoutNotExpired(uint256 remaining);
    error InsufficientMultiSig(uint256 approvals, uint256 required);
    error LockNotFound(bytes32 lockId);
    error WalletNotFound(bytes32 lockId);
    error LockAlreadyActive(bytes32 lockId);
    error LockNotActive(bytes32 lockId);

    // ── Events ──────────────────────────────────────────────────
    event Deposit(address indexed wallet, uint256 amount, string token);
    event Debit(address indexed wallet, uint256 amount, string token);
    event StateLockAcquired(bytes32 indexed lockId, address indexed wallet, uint256 timestamp);
    event StateLockResolved(bytes32 indexed lockId, address indexed wallet, uint256 timestamp);
    event EmergencyUnlockExecuted(bytes32 indexed lockId, address indexed caller, uint256 timestamp);
    event MultiSigApprovalAdded(bytes32 indexed lockId, address indexed signer, uint256 approvals);

    // ── State ───────────────────────────────────────────────────
    address public immutable masterContract;

    // Multi-sig signers for emergency escape hatch (5-of-5 governance board)
    address[5] public multiSigSigners;
    uint256 public constant MULTISIG_THRESHOLD = 3; // 3-of-5 required
    uint256 public constant LOCK_TIMEOUT = 30 minutes;

    enum LockStatus { IDLE, PENDING, LOCKED, RESOLVED }

    struct StateLock {
        bytes32 batchId;
        address wallet;
        LockStatus status;
        uint256 lockedAt;
        uint256 resolvedAt;
        // Emergency escape hatch
        uint256 approvalCount;
        mapping(address => bool) approvedBy;
        address emergencyUnlockedBy;
        uint256 emergencyUnlockedAt;
    }

    // wallet => token => balance
    mapping(address => mapping(string => uint256)) public balances;

    // lockId => StateLock (storage pointer)
    mapping(bytes32 => StateLock) public stateLocks;

    // Reentrancy guard: wallet => isGuarded
    mapping(address => bool) private reentrancyGuards;

    // wallet => isLocked (if ANY lock is active on this wallet)
    mapping(address => bool) private walletLocked;

    // ── Constructor ─────────────────────────────────────────────
    constructor(
        address _masterContract,
        address[5] memory _signers
    ) {
        masterContract = _masterContract;
        multiSigSigners = _signers;
    }

    // ── Modifiers ───────────────────────────────────────────────
    modifier onlyMaster() {
        if (msg.sender != masterContract) revert NotMaster();
        _;
    }

    modifier onlyMultiSigSigner() {
        bool found = false;
        for (uint256 i = 0; i < 5; i++) {
            if (msg.sender == multiSigSigners[i]) {
                found = true;
                break;
            }
        }
        if (!found) revert NotMultiSigSigner(msg.sender);
        _;
    }

    modifier noReentrancy(address wallet) {
        if (reentrancyGuards[wallet]) revert ReentrancyGuardActive(wallet);
        reentrancyGuards[wallet] = true;
        _;
        reentrancyGuards[wallet] = false;
    }

    modifier walletNotLocked(address wallet) {
        if (walletLocked[wallet]) revert WalletLocked(wallet);
        _;
    }

    // ── Deposit ─────────────────────────────────────────────────
    function deposit(
        address wallet,
        uint256 amount,
        string calldata token
    )
        external
        onlyMaster
    {
        balances[wallet][token] += amount;
        emit Deposit(wallet, amount, token);
    }

    // ── Debit (only when wallet is unlocked) ────────────────────
    function debit(
        address wallet,
        uint256 amount,
        string calldata token
    )
        external
        onlyMaster
        walletNotLocked(wallet)
        noReentrancy(wallet)
    {
        uint256 current = balances[wallet][token];
        if (current < amount) revert InsufficientBalance(wallet, amount, current);
        balances[wallet][token] = current - amount;
        emit Debit(wallet, amount, token);
    }

    // ── State Lock Management ───────────────────────────────────

    function acquireStateLock(
        bytes32 lockId,
        bytes32 batchId,
        address wallet
    )
        external
        onlyMaster
    {
        StateLock storage lock = stateLocks[lockId];
        if (lock.batchId != bytes32(0)) revert LockAlreadyActive(lockId);

        lock.batchId = batchId;
        lock.wallet = wallet;
        lock.status = LockStatus.LOCKED;
        lock.lockedAt = block.timestamp;

        walletLocked[wallet] = true;

        emit StateLockAcquired(lockId, wallet, block.timestamp);
    }

    function resolveStateLock(bytes32 lockId)
        external
        onlyMaster
    {
        StateLock storage lock = stateLocks[lockId];
        if (lock.wallet == address(0)) revert LockNotFound(lockId);
        if (lock.status != LockStatus.LOCKED) revert LockNotActive(lockId);

        lock.status = LockStatus.RESOLVED;
        lock.resolvedAt = block.timestamp;

        walletLocked[lock.wallet] = false;

        emit StateLockResolved(lockId, lock.wallet, block.timestamp);
    }

    // ── Emergency Escape Hatch ──────────────────────────────────
    //
    // Dual-factor protection:
    //   1. The LOCK_TIMEOUT (30 minutes) must have expired
    //   2. At least MULTISIG_THRESHOLD (3/5) signers must approve
    //
    // Neither condition alone is sufficient.

    function addEmergencyApproval(bytes32 lockId)
        external
        onlyMultiSigSigner
    {
        StateLock storage lock = stateLocks[lockId];
        if (lock.wallet == address(0)) revert LockNotFound(lockId);
        if (lock.status != LockStatus.LOCKED) revert LockNotActive(lockId);

        if (!lock.approvedBy[msg.sender]) {
            lock.approvedBy[msg.sender] = true;
            lock.approvalCount++;
            emit MultiSigApprovalAdded(lockId, msg.sender, lock.approvalCount);
        }
    }

    function triggerEmergencyUnlock(bytes32 lockId)
        external
        onlyMultiSigSigner
    {
        StateLock storage lock = stateLocks[lockId];
        if (lock.wallet == address(0)) revert LockNotFound(lockId);
        if (lock.status != LockStatus.LOCKED) revert LockNotActive(lockId);

        // Factor 1: timeout must be expired
        if (block.timestamp < lock.lockedAt + LOCK_TIMEOUT) {
            revert EscapeHatchTimeoutNotExpired(
                lock.lockedAt + LOCK_TIMEOUT - block.timestamp
            );
        }

        // Factor 2: multi-sig threshold must be met
        if (lock.approvalCount < MULTISIG_THRESHOLD) {
            revert InsufficientMultiSig(lock.approvalCount, MULTISIG_THRESHOLD);
        }

        lock.status = LockStatus.RESOLVED;
        lock.resolvedAt = block.timestamp;
        lock.emergencyUnlockedBy = msg.sender;
        lock.emergencyUnlockedAt = block.timestamp;

        walletLocked[lock.wallet] = false;

        emit EmergencyUnlockExecuted(lockId, msg.sender, block.timestamp);
    }

    // ── View Functions ──────────────────────────────────────────

    function isWalletLocked(address wallet) external view returns (bool) {
        return walletLocked[wallet];
    }

    function getLockStatus(bytes32 lockId)
        external
        view
        returns (
            LockStatus status,
            uint256 lockedAt,
            uint256 resolvedAt,
            bool timeoutExpired,
            uint256 approvalCount
        )
    {
        StateLock storage lock = stateLocks[lockId];
        status = lock.status;
        lockedAt = lock.lockedAt;
        resolvedAt = lock.resolvedAt;
        timeoutExpired = block.timestamp >= lock.lockedAt + LOCK_TIMEOUT;
        approvalCount = lock.approvalCount;
    }

    function getBalance(address wallet, string calldata token)
        external
        view
        returns (uint256)
    {
        return balances[wallet][token];
    }

    // Receive ETH (Base Sepolia testnet)
    receive() external payable {}
}
