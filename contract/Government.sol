// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Government {
    uint32 public lastCreditorPayedOut;
    uint public lastTimeOfNewCredit;
    uint public profitFromCrash;
    address[] public creditorAddresses;
    uint[] public creditorAmounts;
    address public corruptElite;
    mapping(address => uint) buddies;
    uint constant TWELVE_HOURS = 43200;
    uint8 public round;

    using SafeMath for uint256;

    mapping(address => uint) public balances;

    function transfer(address to, uint amount) public {
        require(balances[msg.sender] >= amount, "Not enough tokens to transfer.");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    function balanceOf(address to) public view returns (uint) {
        require(address(to) != address(0), "Invalid address.");
        return balances[to];
    }

    // Use constructor instead of the contract name
    constructor() payable {
        // The corrupt elite establishes a new government.
        // This is the commitment of the corrupt elite - everything that cannot be saved from a crash.
        profitFromCrash = msg.value;
        corruptElite = msg.sender;
        lastTimeOfNewCredit = block.timestamp;
    }

    function totalDebt() external view returns (uint debt) {
        for (uint i = lastCreditorPayedOut; i < creditorAmounts.length; i++) {
            debt = debt.add(creditorAmounts[i]);
        }
        // Add interest for unpaid creditors
        debt = debt.add(debt.mul(10) / 100); // 10% interest
    }

    function totalPayedOut() external view returns (uint payout) {
        for (uint i = 0; i < lastCreditorPayedOut; i++) {
            payout = payout.add(creditorAmounts[i]);
        }
        // Add interest for paid creditors
        payout = payout.add(payout.mul(10) / 100); // 10% interest
    }

    // Fallback function
    receive() external payable {
        require(msg.value > 0, "You must send money greater than 0 wei.");

        // Check if there are creditors to pay
        uint remainingAmount = msg.value;
        for (uint i = lastCreditorPayedOut; i < creditorAddresses.length; i++) {
            address creditor = creditorAddresses[i];
            uint amountToPay = creditorAmounts[i];
            if (remainingAmount >= amountToPay) {
                // Send the full amount to the creditor
                payable(creditor).transfer(amountToPay);
                remainingAmount -= amountToPay;
                // Mark the creditor as paid
                lastCreditorPayedOut = uint32(i + 1);
            } else {
                // Send the remaining amount and break the loop
                payable(creditor).transfer(remainingAmount);
                break;
            }
        }
    }

    // Only the corrupt elite can invest in the system
    modifier onlyCorruptElite() {
        require(msg.sender == corruptElite, "You are not the corrupt elite.");
        _;
    }

    // Only the corrupt elite can invest in the system
    function investInTheSystem() external payable onlyCorruptElite {
        profitFromCrash = profitFromCrash.add(msg.value);
    }

    // From time to time the corrupt elite inherits its power to the next generation
    function inheritToNextGeneration(address nextGeneration) external {
        require(msg.sender == corruptElite, "You are not the corrupt elite.");
        corruptElite = nextGeneration;
    }

    function getCreditorAddresses() external view returns (address[] memory) {
        return creditorAddresses;
    }

    function getCreditorAmounts() external view returns (uint[] memory) {
        return creditorAmounts;
    }
}

library SafeMath {
    function add(uint a, uint b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) return 0;
        uint c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    // Safe division function
    function div(uint a, uint b) internal pure returns (uint) {
        require(b > 0, "SafeMath: division by zero");
        uint c = a / b;
        return c;
    }
}
