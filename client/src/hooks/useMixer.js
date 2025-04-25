import { useState, useEffect } from "react";
import * as ethers from "ethers";
import { generateSecret } from "../utils/depositNote";

export const useMixer = (contract, setStatus, fetchWalletBalance, provider, account, chainId) => {
   const [withdrawSecret, setWithdrawSecret] = useState("");
   const [withdrawAddress, setWithdrawAddress] = useState("");
   const [selectedDenomination, setSelectedDenomination] = useState(null);
   const [selectedToken, setSelectedToken] = useState("ETH");
   const [depositNote, setDepositNote] = useState("");
   const [withdrawNoteError, setWithdrawNoteError] = useState("");
   const [feePercentage, setFeePercentage] = useState(0);
   const [contractBalance, setContractBalance] = useState(null);
   const [transactionHistory, setTransactionHistory] = useState([]);
   const [poolStats, setPoolStats] = useState({ deposits: {}, withdrawals: {} });
   const [allDeposits, setAllDeposits] = useState([]);

   const denominations = [0.1, 1, 5, 10, 100];

   const fetchFeePercentage = async () => {
      if (!contract || !contract.feePercentage || !contract.target) {
         console.error("Contract or feePercentage method not available", {
            contract: contract,
            hasFeePercentage: !!contract?.feePercentage,
            hasTarget: !!contract?.target,
         });
         setFeePercentage(0);
         return;
      }
      try {
         console.log("Attempting to fetch feePercentage from contract at:", contract.target);
         const fee = await contract.feePercentage();
         console.log("Raw feePercentage:", fee.toString());
         const formattedFee = ethers.formatUnits(fee, 0);
         const percentage = Number(formattedFee) / 100;
         console.log("Formatted feePercentage:", percentage);
         setFeePercentage(percentage);
      } catch (error) {
         console.error("Failed to fetch fee percentage:", error);
         setStatus("Failed to fetch fee percentage. Please ensure the contract is deployed correctly.");
         setFeePercentage(0);
      }
   };

   const fetchContractBalance = async () => {
      if (!provider || !contract || !contract.target) {
         return;
      }
      try {
         const balance = await provider.getBalance(contract.target);
         setContractBalance(ethers.formatEther(balance));
      } catch (error) {
         console.error("Failed to fetch contract balance:", error);
      }
   };

   const fetchAllDeposits = async () => {
      if (!contract || !provider) return;

      try {
         const filter = contract.filters.Deposit();
         const events = await contract.queryFilter(filter, 0, "latest");
         const deposits = await Promise.all(
            events.map(async (event) => {
               const block = await provider.getBlock(event.blockNumber);
               return {
                  denomination: ethers.formatEther(event.args.denomination),
                  timestamp: block.timestamp * 1000,
               };
            })
         );
         setAllDeposits(deposits);
      } catch (error) {
         console.error("Failed to fetch all deposits:", error);
         setStatus("Failed to fetch deposit history.");
      }
   };

   const handleDeposit = async (chainId) => {
      if (!contract || !contract.target) {
         console.error("Contract not initialized", {
            contract: contract,
            hasTarget: !!contract?.target,
         });
         setStatus("Contract is not initialized. Please check network and contract address.");
         return;
      }
      if (!contract.deposit) {
         console.error("Deposit method unavailable in contract", {
            contract: contract,
            hasDeposit: !!contract?.deposit,
         });
         setStatus("Deposit method is unavailable. Please ensure the contract ABI is correct.");
         return;
      }
      if (!account) {
         setStatus("Please connect your wallet.");
         return;
      }
      if (!selectedDenomination) {
         setStatus("Please select a denomination.");
         return;
      }

      try {
         setStatus("Initiating deposit...");
         const secret = generateSecret();
         const normalizedSecret = secret.trim().toLowerCase();
         const commitment = ethers.keccak256(ethers.toUtf8Bytes(normalizedSecret));
         console.log("Deposit - Secret:", normalizedSecret);
         console.log("Deposit - Commitment:", commitment);

         const denomination = ethers.parseEther(selectedDenomination.toString());

         // Новый синтаксис для Ethers.js v6
         const estimatedGas = await contract.deposit.estimateGas(commitment, denomination, {
            value: denomination,
         });

         const gasLimit = estimatedGas * BigInt(120) / BigInt(100);

         const tx = await contract.deposit(commitment, denomination, {
            value: denomination,
            gasLimit: gasLimit,
         });
         await tx.wait();
         setStatus("Deposit successful!");
         setDepositNote(`mixer-${normalizedSecret}-${chainId}`);
         setTransactionHistory((prev) => [
            ...prev,
            {
               type: "Deposit",
               amount: selectedDenomination,
               txHash: tx.hash,
               timestamp: new Date().toLocaleString(),
            },
         ]);
         fetchWalletBalance();
         fetchContractBalance();
         await fetchAllDeposits();
      } catch (error) {
         console.error("Deposit failed:", error);
         setStatus(`Deposit failed: ${error.message}`);
      }
   };

   const handleWithdraw = async () => {
      if (!contract || !contract.target) {
         console.error("Contract not initialized", {
            contract: contract,
            hasTarget: !!contract?.target,
         });
         setStatus("Contract is not initialized. Please check network and contract address.");
         return;
      }
      if (!contract.withdraw) {
         console.error("Withdraw method unavailable in contract", {
            contract: contract,
            hasWithdraw: !!contract?.withdraw,
         });
         setStatus("Withdraw method is unavailable. Please ensure the contract ABI is correct.");
         return;
      }
      if (!withdrawSecret || !withdrawAddress) {
         setStatus("Please provide note and withdraw address");
         return;
      }

      const notePattern = /^mixer-(.+)-(\d+)$/;
      const match = withdrawSecret.match(notePattern);
      if (!match) {
         setWithdrawNoteError("Invalid note format. Expected: mixer-<secret>-<chainId>");
         setStatus("Invalid note format. Please check your note and try again.");
         return;
      }

      const secret = match[1];
      const noteChainId = match[2];

      if (noteChainId !== chainId.toString()) {
         setWithdrawNoteError(`Note chainId (${noteChainId}) does not match current chainId (${chainId})`);
         setStatus("Note chainId does not match current network. Please switch network.");
         return;
      }

      if (!ethers.isAddress(withdrawAddress)) {
         setStatus("Invalid withdraw address.");
         return;
      }

      try {
         setStatus("Initiating withdrawal...");
         const normalizedSecret = secret.trim().toLowerCase();
         const commitment = ethers.keccak256(ethers.toUtf8Bytes(normalizedSecret));
         console.log("Withdraw - Secret:", normalizedSecret);
         console.log("Withdraw - Commitment:", commitment);

         // Новый синтаксис для Ethers.js v6
         const estimatedGas = await contract.withdraw.estimateGas(commitment, withdrawAddress);
         const gasLimit = estimatedGas * BigInt(120) / BigInt(100);

         const tx = await contract.withdraw(commitment, withdrawAddress, { gasLimit });
         await tx.wait();
         setStatus("Withdrawal successful!");
         setTransactionHistory((prev) => [
            ...prev,
            {
               type: "Withdraw",
               to: withdrawAddress,
               txHash: tx.hash,
               timestamp: new Date().toLocaleString(),
            },
         ]);
         fetchWalletBalance();
         fetchContractBalance();
         await fetchAllDeposits();
      } catch (error) {
         console.error("Withdrawal failed:", error);
         setStatus("Withdrawal failed. Please check your note and try again.");
      }
   };

   const clearTransactionHistory = () => {
      setTransactionHistory([]);
   };

   useEffect(() => {
      if (contract && contract.target && provider && account) {
         fetchFeePercentage();
         fetchContractBalance();
         fetchAllDeposits();
      }
   }, [contract, provider, account]);

   useEffect(() => {
      if (!contract) return;

      const onDeposit = (commitment, denomination, event) => {
         fetchAllDeposits();
      };

      contract.on("Deposit", onDeposit);

      return () => {
         contract.off("Deposit", onDeposit);
      };
   }, [contract]);

   return {
      withdrawSecret,
      setWithdrawSecret,
      withdrawAddress,
      setWithdrawAddress,
      selectedDenomination,
      setSelectedDenomination,
      selectedToken,
      setSelectedToken,
      depositNote,
      setDepositNote,
      withdrawNoteError,
      setWithdrawNoteError,
      feePercentage,
      fetchFeePercentage,
      contractBalance,
      allDeposits,
      transactionHistory,
      denominations,
      poolStats,
      clearTransactionHistory,
      handleDeposit,
      handleWithdraw,
   };
};