export const VaultStayEscrowABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "raisedBy",
        "type": "address"
      }
    ],
    "name": "DisputeRaised",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "tenantRefunded",
        "type": "bool"
      }
    ],
    "name": "DisputeResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "RentalActivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "initiator",
        "type": "address"
      }
    ],
    "name": "RentalCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "RentalCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "landlord",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rent",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "deposit",
        "type": "uint256"
      }
    ],
    "name": "RentalCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tenant",
        "type": "address"
      }
    ],
    "name": "RentalFunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Withdrawal",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "activateRental",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "autoResolveTimeout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "cancelRental",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "confirmCompletion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "rentAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "depositAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "ipfsCID",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "paymentToken",
        "type": "address"
      }
    ],
    "name": "createListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "fundRental",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllListings",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address payable",
            "name": "landlord",
            "type": "address"
          },
          {
            "internalType": "address payable",
            "name": "tenant",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "rentAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "depositAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "enum VaultStayEscrow.RentalState",
            "name": "state",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "ipfsCID",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "landlordConfirmed",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "tenantConfirmed",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "paymentToken",
            "type": "address"
          }
        ],
        "internalType": "struct VaultStayEscrow.Rental[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getListing",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address payable",
            "name": "landlord",
            "type": "address"
          },
          {
            "internalType": "address payable",
            "name": "tenant",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "rentAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "depositAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "enum VaultStayEscrow.RentalState",
            "name": "state",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "ipfsCID",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "landlordConfirmed",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "tenantConfirmed",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "paymentToken",
            "type": "address"
          }
        ],
        "internalType": "struct VaultStayEscrow.Rental",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "pendingTokenWithdrawals",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "raiseDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rentalCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "rentals",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address payable",
        "name": "landlord",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "tenant",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "rentAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "depositAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "enum VaultStayEscrow.RentalState",
        "name": "state",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "ipfsCID",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "landlordConfirmed",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "tenantConfirmed",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "paymentToken",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "refundTenant",
        "type": "bool"
      }
    ],
    "name": "resolveDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;