const fs = require("fs");
const path = require("path");

const constantsPath = path.join(__dirname, "../src/constants.js");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const SimpleMixer = await hre.ethers.getContractFactory("SimpleMixer");
    const feeRecipient = deployer.address;
    const feePercentage = 50; // 0.5%
    const mixer = await SimpleMixer.deploy(feeRecipient, feePercentage);

    await mixer.waitForDeployment();

    const contractAddress = mixer.target;
    console.log("SimpleMixer deployed to:", contractAddress);

    // Обновляем constants.js
    const constantsContent = `
    export const CONTRACT_ADDRESS = "${contractAddress}";

    export const SUPPORTED_CHAINS = {
        31337: "Hardhat Localhost",
        1: "Ethereum Mainnet",
        56: "Binance Smart Chain",
        137: "Polygon",
        10: "Optimism",
        42161: "Arbitrum One",
        100: "Gnosis Chain",
        43114: "Avalanche Mainnet",
        5: "Ethereum Goerli",
    };
    `;
    fs.writeFileSync(constantsPath, constantsContent);
    console.log("Updated constants.js with new contract address");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });