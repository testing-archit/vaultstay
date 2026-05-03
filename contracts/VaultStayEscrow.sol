// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VaultStayEscrow
 * @dev Decentralized rental escrow contract using a Pull payment pattern for maximum security.
 */
contract VaultStayEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    enum RentalState { Created, Funded, Active, Completed, Cancelled, Disputed }

    struct Rental {
        uint256 id;
        address payable landlord;
        address payable tenant;
        uint256 rentAmount;
        uint256 depositAmount;
        uint256 startTimestamp;
        uint256 endTimestamp;
        RentalState state;
        string ipfsCID;
        bool landlordConfirmed;
        bool tenantConfirmed;
        address paymentToken;
    }

    uint256 public rentalCount;
    mapping(uint256 => Rental) public rentals;
    
    // Pull Payment Pattern: mapping of token => address => claimable balance
    // token address(0) represents native ETH
    mapping(address => mapping(address => uint256)) public pendingTokenWithdrawals;

    event RentalCreated(uint256 indexed id, address landlord, uint256 rent, uint256 deposit);
    event RentalFunded(uint256 indexed id, address tenant);
    event RentalActivated(uint256 indexed id);
    event RentalCompleted(uint256 indexed id);
    event RentalCancelled(uint256 indexed id, address initiator);
    event DisputeRaised(uint256 indexed id, address raisedBy);
    event DisputeResolved(uint256 indexed id, bool tenantRefunded);
    event Withdrawal(address indexed user, address token, uint256 amount);

    constructor() Ownable(msg.sender) {}

    modifier inState(uint256 id, RentalState expected) {
        require(rentals[id].state == expected, "Invalid state transition");
        _;
    }

    modifier onlyLandlord(uint256 id) {
        require(msg.sender == rentals[id].landlord, "Only landlord");
        _;
    }

    modifier onlyTenant(uint256 id) {
        require(msg.sender == rentals[id].tenant, "Only tenant");
        _;
    }

    modifier validRental(uint256 id) {
        require(id > 0 && id <= rentalCount, "Rental does not exist");
        _;
    }

    /**
     * @dev Landlords create a new listing.
     */
    function createListing(
        uint256 rentAmount,
        uint256 depositAmount,
        uint256 startTimestamp,
        uint256 endTimestamp,
        string calldata ipfsCID,
        address paymentToken
    ) external {
        require(startTimestamp > block.timestamp, "Must start in the future");
        require(endTimestamp > startTimestamp, "End must be after start");

        rentalCount++;
        uint256 id = rentalCount;

        rentals[id] = Rental({
            id: id,
            landlord: payable(msg.sender),
            tenant: payable(address(0)),
            rentAmount: rentAmount,
            depositAmount: depositAmount,
            startTimestamp: startTimestamp,
            endTimestamp: endTimestamp,
            state: RentalState.Created,
            ipfsCID: ipfsCID,
            landlordConfirmed: false,
            tenantConfirmed: false,
            paymentToken: paymentToken
        });

        emit RentalCreated(id, msg.sender, rentAmount, depositAmount);
    }

    /**
     * @dev Tenants fund a listing.
     */
    function fundRental(uint256 id) external payable nonReentrant validRental(id) inState(id, RentalState.Created) {
        require(msg.sender != rentals[id].landlord, "Landlord cannot fund");
        uint256 totalRequired = rentals[id].rentAmount + rentals[id].depositAmount;
        
        address token = rentals[id].paymentToken;
        if (token == address(0)) {
            require(msg.value == totalRequired, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "Do not send ETH for ERC20 rental");
            IERC20(token).safeTransferFrom(msg.sender, address(this), totalRequired);
        }

        rentals[id].tenant = payable(msg.sender);
        rentals[id].state = RentalState.Funded;

        emit RentalFunded(id, msg.sender);
    }

    /**
     * @dev Landlord activates the rental after start date.
     */
    function activateRental(uint256 id) external validRental(id) onlyLandlord(id) inState(id, RentalState.Funded) {
        require(block.timestamp >= rentals[id].startTimestamp, "Cannot activate before start time");

        rentals[id].state = RentalState.Active;

        emit RentalActivated(id);
    }

    /**
     * @dev Both parties confirm completion to release funds to withdrawal mapping.
     */
    function confirmCompletion(uint256 id) external validRental(id) inState(id, RentalState.Active) nonReentrant {
        require(msg.sender == rentals[id].landlord || msg.sender == rentals[id].tenant, "Must be landlord or tenant");

        if (msg.sender == rentals[id].landlord) {
            rentals[id].landlordConfirmed = true;
        } else if (msg.sender == rentals[id].tenant) {
            rentals[id].tenantConfirmed = true;
        }

        if (rentals[id].landlordConfirmed && rentals[id].tenantConfirmed) {
            _completeRental(id);
        }
    }

    function _completeRental(uint256 id) private {
        rentals[id].state = RentalState.Completed;

        address landlord = rentals[id].landlord;
        address tenant = rentals[id].tenant;
        uint256 rent = rentals[id].rentAmount;
        uint256 deposit = rentals[id].depositAmount;

        emit RentalCompleted(id);

        address token = rentals[id].paymentToken;
        // Pull Pattern: Increment pending balances instead of direct transfer
        pendingTokenWithdrawals[token][landlord] += rent;
        pendingTokenWithdrawals[token][tenant] += deposit;
    }

    /**
     * @dev Cancellation logic with refunds.
     */
    function cancelRental(uint256 id) external validRental(id) nonReentrant {
        Rental storage r = rentals[id];

        if (r.state == RentalState.Created) {
            require(msg.sender == r.landlord, "Only landlord can cancel created rental");
            r.state = RentalState.Cancelled;
            emit RentalCancelled(id, msg.sender);
        } else if (r.state == RentalState.Funded) {
            require(
                msg.sender == r.tenant || (msg.sender == r.landlord && block.timestamp < r.startTimestamp),
                "Invalid cancellation conditions"
            );
            
            r.state = RentalState.Cancelled;
            uint256 refundAmount = r.rentAmount + r.depositAmount;
            address tenant = r.tenant;

            emit RentalCancelled(id, msg.sender);

            address token = r.paymentToken;
            // Pull Pattern: Increment pending balance
            pendingTokenWithdrawals[token][tenant] += refundAmount;
        } else {
            revert("Cannot cancel in this state");
        }
    }

    function raiseDispute(uint256 id) external validRental(id) inState(id, RentalState.Active) {
        require(msg.sender == rentals[id].landlord || msg.sender == rentals[id].tenant, "Must be landlord or tenant");
        
        rentals[id].state = RentalState.Disputed;
        emit DisputeRaised(id, msg.sender);
    }

    /**
     * @dev Owner-mediated dispute resolution.
     */
    function resolveDispute(uint256 id, bool refundTenant) external validRental(id) inState(id, RentalState.Disputed) onlyOwner nonReentrant {
        rentals[id].state = RentalState.Completed;
        uint256 totalAmount = rentals[id].rentAmount + rentals[id].depositAmount;

        emit DisputeResolved(id, refundTenant);

        address token = rentals[id].paymentToken;
        if (refundTenant) {
            pendingTokenWithdrawals[token][rentals[id].tenant] += totalAmount;
        } else {
            pendingTokenWithdrawals[token][rentals[id].landlord] += totalAmount;
        }
    }

    /**
     * @dev Users call this to claim their tokens/ETH.
     */
    function withdraw(address token) external nonReentrant {
        uint256 amount = pendingTokenWithdrawals[token][msg.sender];
        require(amount > 0, "No funds to withdraw");

        pendingTokenWithdrawals[token][msg.sender] = 0;
        
        if (token == address(0)) {
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Withdrawal failed");
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit Withdrawal(msg.sender, token, amount);
    }
    
    /**
     * @dev Automatically resolve a rental that has passed its end date by 7 days.
     */
    function autoResolveTimeout(uint256 id) external validRental(id) inState(id, RentalState.Active) nonReentrant {
        require(block.timestamp > rentals[id].endTimestamp + 7 days, "Timeout period not reached");
        _completeRental(id);
    }

    function getListing(uint256 id) external view validRental(id) returns (Rental memory) {
        return rentals[id];
    }

    function getAllListings() external view returns (Rental[] memory) {
        Rental[] memory allRentals = new Rental[](rentalCount);
        for (uint256 i = 0; i < rentalCount; i++) {
            allRentals[i] = rentals[i + 1];
        }
        return allRentals;
    }
}
