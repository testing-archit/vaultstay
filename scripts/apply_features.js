const fs = require('fs');

// 1. Update VaultStayEscrow.sol
let sol = fs.readFileSync('contracts/VaultStayEscrow.sol', 'utf8');

// Add IERC20 import
sol = sol.replace(
  'import "@openzeppelin/contracts/access/Ownable.sol";',
  'import "@openzeppelin/contracts/access/Ownable.sol";\nimport "@openzeppelin/contracts/token/ERC20/IERC20.sol";\nimport "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";'
);

// Add payment token logic
sol = sol.replace(
    'contract VaultStayEscrow is ReentrancyGuard, Ownable {',
    'contract VaultStayEscrow is ReentrancyGuard, Ownable {\n    using SafeERC20 for IERC20;'
);

sol = sol.replace(
    'struct Rental {',
    'struct Rental {\n        address paymentToken;'
);

sol = sol.replace(
    'mapping(address => uint256) public pendingWithdrawals;',
    'mapping(address => mapping(address => uint256)) public pendingTokenWithdrawals;'
);

sol = sol.replace(
    'event RentalCreated(uint256 indexed id, address landlord, uint256 rent, uint256 deposit);',
    'event RentalCreated(uint256 indexed id, address landlord, address paymentToken, uint256 rent, uint256 deposit);'
);

sol = sol.replace(
    'event Withdrawal(address indexed user, uint256 amount);',
    'event Withdrawal(address indexed user, address token, uint256 amount);'
);

// Update createListing
sol = sol.replace(
    'function createListing(\n        uint256 rentAmount,\n        uint256 depositAmount,\n        uint256 startTimestamp,\n        uint256 endTimestamp,\n        string calldata ipfsCID\n    ) external {',
    'function createListing(\n        address paymentToken,\n        uint256 rentAmount,\n        uint256 depositAmount,\n        uint256 startTimestamp,\n        uint256 endTimestamp,\n        string calldata ipfsCID\n    ) external {'
);

sol = sol.replace(
    'rentals[id] = Rental({',
    'rentals[id] = Rental({\n            paymentToken: paymentToken,'
);

sol = sol.replace(
    'emit RentalCreated(id, msg.sender, rentAmount, depositAmount);',
    'emit RentalCreated(id, msg.sender, paymentToken, rentAmount, depositAmount);'
);

// Update fundRental
sol = sol.replace(
    'function fundRental(uint256 id) external payable nonReentrant validRental(id) inState(id, RentalState.Created) {',
    'function fundRental(uint256 id) external payable nonReentrant validRental(id) inState(id, RentalState.Created) {'
);

sol = sol.replace(
    'require(msg.value == totalRequired, "Incorrect ETH amount");',
    `if (rentals[id].paymentToken == address(0)) {
            require(msg.value == totalRequired, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "Do not send ETH for ERC20 rental");
            IERC20(rentals[id].paymentToken).safeTransferFrom(msg.sender, address(this), totalRequired);
        }`
);

// Update _completeRental
sol = sol.replace(
    'pendingWithdrawals[landlord] += rent;\n        pendingWithdrawals[tenant] += deposit;',
    `address token = rentals[id].paymentToken;
        pendingTokenWithdrawals[token][landlord] += rent;
        pendingTokenWithdrawals[token][tenant] += deposit;`
);

// Update cancelRental
sol = sol.replace(
    'pendingWithdrawals[tenant] += refundAmount;',
    'pendingTokenWithdrawals[r.paymentToken][tenant] += refundAmount;'
);

// Update resolveDispute
sol = sol.replace(
    'if (refundTenant) {\n            pendingWithdrawals[rentals[id].tenant] += totalAmount;\n        } else {\n            pendingWithdrawals[rentals[id].landlord] += totalAmount;\n        }',
    `address token = rentals[id].paymentToken;
        if (refundTenant) {
            pendingTokenWithdrawals[token][rentals[id].tenant] += totalAmount;
        } else {
            pendingTokenWithdrawals[token][rentals[id].landlord] += totalAmount;
        }`
);

// Update withdraw
sol = sol.replace(
    'function withdraw() external nonReentrant {',
    'function withdraw(address token) external nonReentrant {'
);

sol = sol.replace(
    'uint256 amount = pendingWithdrawals[msg.sender];',
    'uint256 amount = pendingTokenWithdrawals[token][msg.sender];'
);

sol = sol.replace(
    'pendingWithdrawals[msg.sender] = 0;',
    'pendingTokenWithdrawals[token][msg.sender] = 0;'
);

sol = sol.replace(
    '(bool success, ) = msg.sender.call{value: amount}("");\n        require(success, "Withdrawal failed");',
    `if (token == address(0)) {
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }`
);

sol = sol.replace(
    'emit Withdrawal(msg.sender, amount);',
    'emit Withdrawal(msg.sender, token, amount);'
);

// Add autoResolve Timeout
let autoResolveCode = `
    /**
     * @dev Automatically complete rental if tenant doesn't confirm 7 days after endTimestamp.
     */
    function autoResolveTimeout(uint256 id) external validRental(id) inState(id, RentalState.Active) nonReentrant {
        require(block.timestamp > rentals[id].endTimestamp + 7 days, "Timeout period not reached");
        _completeRental(id);
    }
`;
sol = sol.replace(
    'function getListing',
    autoResolveCode + '\n    function getListing'
);

fs.writeFileSync('contracts/VaultStayEscrow.sol', sol);
console.log("VaultStayEscrow updated");

