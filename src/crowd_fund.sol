// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

contract CrowdFund {
    address owner;
    bool isStarted;
    uint256 public endTime;
    uint256 totalFundingAmount;
    uint256 public goalAmount;

    constructor(uint _endTime, uint _goalAmount) {
        owner = msg.sender;
        isStarted = true;
        endTime= _endTime;
        goalAmount= _goalAmount;
    }

    modifier isOwner(){
        require(msg.sender == owner, "You are not the owner");
        _;
    }

    mapping(address => uint) sentFunds;
    function setFund() payable public {
        require(msg.sender==owner,"You are not allowed");
        require(goalAmount > (totalFundingAmount+msg.value), "Goal Amout have reached");
        require(isStarted, "Funding hasn't started yet!");
        require(block.timestamp < endTime, "Funding is stopped");
        require(!(sentFunds[msg.sender] > 0), "You are only allowed to transfer one time");
        require(msg.value > 0, "You should transfer more then zero.");
        sentFunds[msg.sender] = msg.value;
        totalFundingAmount += msg.value;
    }

    function endFunding() public isOwner{
        require(isStarted, "Funding isn't started yet!");
        isStarted = false;
    }

    function checkYourFunds(address myAddress) public view returns(uint){
        return sentFunds[myAddress];
    }

    function checkAllFunds() public view returns(uint){
        return address(this).balance;
    }

    function withdrawalSomeFunds(uint amount) public isOwner returns(bool){
        totalFundingAmount -= amount;
        (bool status,) = msg.sender.call{value: amount}("");
        require(status, "Your transfer failed");
        return status;
    }
    function withdrawAll() public returns(bool) {
        // uint amount = address(this).balance;
        uint amount=totalFundingAmount;
        totalFundingAmount=0;
        (bool status,) = msg.sender.call{value: amount}("");
        require(status,"Your Transfer failed");
        return status;
    }

}