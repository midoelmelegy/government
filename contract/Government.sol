// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Government {
    uint32 public lastCreditorPayedOut;
    uint public lastTimeOfNewCredit;
    uint public profitFromCrash;
    address[] public creditorAddresses;
    uint[] public creditorAmounts;
    address public corruptElite;
    mapping (address => uint) buddies;
    uint constant TWELVE_HOURS = 43200;
    uint8 public round;

    // Use constructor instead of the contract name
    constructor() payable {
        // The corrupt elite establishes a new government.
        // This is the commitment of the corrupt elite - everything that cannot be saved from a crash.
        profitFromCrash = msg.value;
        corruptElite = msg.sender;
        lastTimeOfNewCredit = block.timestamp;
    }

    function lendGovernmentMoney(address buddy) external payable returns (bool) {
        require(msg.value > 0, "You must lend money greater than 0 wei.");
        uint amount = msg.value;

        // Check if the system already broke down. If for 12h no new creditor gives new credit to the system, it will break down.
        // 12h is on average = 60*60*12/12.5 = 3456
        if (lastTimeOfNewCredit + TWELVE_HOURS < block.timestamp) {
            // Sends all contract money to the last creditor
            if (creditorAddresses.length > 0) {
                payable(creditorAddresses[creditorAddresses.length - 1]).transfer(profitFromCrash);
            }

            // Reset contract state
            lastCreditorPayedOut = 0;
            lastTimeOfNewCredit = block.timestamp;
            profitFromCrash = 0;
            round += 1;

            // Return money to sender
            payable(msg.sender).transfer(amount);
            return false;
        } else {
            // The system needs to collect at least 1% of the profit from a crash to stay alive
            if (amount >= 10**18) {
                // The system has received fresh money, it will survive at least 12h more
                lastTimeOfNewCredit = block.timestamp;

                // Register the new creditor and their amount with 10% interest rate
                creditorAddresses.push(msg.sender);
                creditorAmounts.push(amount * 110 / 100);

                // Now the money is distributed
                // First, the corrupt elite grabs 5% - thieves!
                payable(corruptElite).transfer(amount * 5 / 100);

                // 5% are going into the economy (they will increase the value for the person seeing the crash coming).
                if (profitFromCrash < 10000 * 10**18) {
                    profitFromCrash += amount * 5 / 100;
                }

                // If you have a buddy in the government (and they are in the creditor list), they can get 5% of your credits.
                // Make a deal with them.
                if (buddies[buddy] >= amount) {
                    payable(buddy).transfer(amount * 5 / 100);
                }

                buddies[msg.sender] += amount * 110 / 100;

                // 90% of the money will be used to pay out old creditors
                while (lastCreditorPayedOut < creditorAmounts.length && creditorAmounts[lastCreditorPayedOut] <= address(this).balance - profitFromCrash) {
                    payable(creditorAddresses[lastCreditorPayedOut]).transfer(creditorAmounts[lastCreditorPayedOut]);
                    buddies[creditorAddresses[lastCreditorPayedOut]] -= creditorAmounts[lastCreditorPayedOut];
                    lastCreditorPayedOut += 1;
                }
                return true;
            } else {
                // Return money to sender if the amount is less than 1 ether
                payable(msg.sender).transfer(amount);
                return false;
            }
        }
    }

    // Fallback function
    receive() external payable {
        lendGovernmentMoney(0);
    }

    function totalDebt() external view returns (uint debt) {
        for (uint i = lastCreditorPayedOut; i < creditorAmounts.length; i++) {
            debt += creditorAmounts[i];
        }
    }

    function totalPayedOut() external view returns (uint payout) {
        for (uint i = 0; i < lastCreditorPayedOut; i++) {
            payout += creditorAmounts[i];
        }
    }

    // Better don't do it (unless you are the corrupt elite and you want to establish trust in the system)
    function investInTheSystem() external payable {
        profitFromCrash += msg.value;
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
