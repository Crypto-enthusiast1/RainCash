// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleMixer {
    address public feeRecipient;
    uint256 public feePercentage;
    mapping(bytes32 => uint256) public commitments; // Изменили с bool на uint256 для хранения denomination
    mapping(uint256 => uint256) public depositsCount;
    mapping(uint256 => uint256) public withdrawalsCount;

    // Поддерживаемые номиналы (в wei)
    uint256[] public denominations = [
        0.1 ether, // 0.1 ETH
        1 ether, // 1 ETH
        5 ether, // 5 ETH
        10 ether, // 10 ETH
        100 ether // 100 ETH
    ];

    mapping(address => bool) public supportedTokens;

    event Deposit(bytes32 indexed commitment, uint256 denomination);
    event Withdrawal(bytes32 commitment, address to);
    event TokenSupportAdded(address token);

    constructor(address _feeRecipient, uint256 _feePercentage) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_feePercentage <= 1000, "Fee percentage too high"); // Максимум 10%
        feeRecipient = _feeRecipient;
        feePercentage = _feePercentage;
        supportedTokens[address(0)] = true; // ETH
    }

    function addTokenSupport(address token) external {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
        emit TokenSupportAdded(token);
    }

    function deposit(
        bytes32 commitment,
        uint256 denomination
    ) external payable {
        require(commitments[commitment] == 0, "Commitment already used"); // Проверяем, что commitment не использован
        require(isValidDenomination(denomination), "Invalid denomination");

        if (msg.sender != address(0)) {
            require(supportedTokens[address(0)], "ETH not supported");
            require(msg.value == denomination, "Incorrect ETH amount");
        } else {
            require(supportedTokens[msg.sender], "Token not supported");
            IERC20 token = IERC20(msg.sender);
            require(
                token.transferFrom(msg.sender, address(this), denomination),
                "Token transfer failed"
            );
        }

        commitments[commitment] = denomination; // Сохраняем denomination
        depositsCount[denomination]++;
        emit Deposit(commitment, denomination);
    }

    function withdraw(bytes32 commitment, address payable to) external {
        uint256 denomination = commitments[commitment];
        require(denomination > 0, "Commitment does not exist"); // Проверяем, что commitment существует

        delete commitments[commitment]; // Удаляем commitment после вывода

        uint256 fee = (denomination * feePercentage) / 10000;
        uint256 amount = denomination - fee;

        // Проверяем, что это ETH (address(0))
        if (!supportedTokens[msg.sender]) {
            payable(feeRecipient).transfer(fee);
            to.transfer(amount);
        } else {
            IERC20 token = IERC20(msg.sender);
            require(token.transfer(feeRecipient, fee), "Fee transfer failed");
            require(token.transfer(to, amount), "Token transfer failed");
        }

        withdrawalsCount[denomination]++;
        emit Withdrawal(commitment, to);
    }

    function isValidDenomination(
        uint256 denomination
    ) public view returns (bool) {
        for (uint256 i = 0; i < denominations.length; i++) {
            if (denominations[i] == denomination) {
                return true;
            }
        }
        return false;
    }

    function getDenominations() external view returns (uint256[] memory) {
        return denominations;
    }
}
