import { useState, useEffect } from "react";
import { ethers } from "ethers";
import SimpleMixerABI from "../abi/SimpleMixerABI.json";
import { CONTRACT_ADDRESS, SUPPORTED_CHAINS } from "../constants";

export const useWallet = () => {
   const [provider, setProvider] = useState(null);
   const [signer, setSigner] = useState(null);
   const [contract, setContract] = useState(null);
   const [account, setAccount] = useState(null);
   const [chainId, setChainId] = useState(null);
   const [status, setStatus] = useState("");
   const [walletBalance, setWalletBalance] = useState(null);

   const fetchWalletBalance = async (provider, account) => {
      if (provider && account) {
         try {
            const balance = await provider.getBalance(account);
            const balanceInEth = ethers.formatEther(balance);
            setWalletBalance(Number(balanceInEth).toFixed(4));
         } catch (error) {
            setWalletBalance(null);
            setStatus(`Failed to fetch wallet balance: ${error.message}`);
         }
      }
   };

   const setupConnection = async () => {
      console.log("setupConnection called");
      if (!window.ethereum) {
         setStatus("Please install MetaMask");
         return;
      }

      try {
         const provider = new ethers.BrowserProvider(window.ethereum);
         const network = await provider.getNetwork();
         const currentChainId = Number(network.chainId);
         setChainId(currentChainId);
         console.log("Network:", network, "ChainId:", currentChainId);
         if (!SUPPORTED_CHAINS[currentChainId]) {
            throw new Error(
               `Unsupported network! Please switch to one of: ${Object.values(SUPPORTED_CHAINS).join(", ")}`
            );
         }
         const signer = await provider.getSigner();
         const address = await signer.getAddress();
         console.log("Signer address:", address);
         console.log("Signer:", signer);
         if (!ethers.isAddress(CONTRACT_ADDRESS)) {
            throw new Error(`Invalid contract address: ${CONTRACT_ADDRESS}`);
         }
         console.log("CONTRACT_ADDRESS:", CONTRACT_ADDRESS);
         console.log("SimpleMixerABI.abi:", SimpleMixerABI.abi);
         const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, SimpleMixerABI.abi, signer);
         console.log("Contract initialized:", contractInstance);
         console.log("Contract address from instance:", contractInstance.address);
         console.log("Contract target:", contractInstance.target);
         setProvider(provider);
         setSigner(signer);
         setContract(contractInstance);
         setAccount(address);
         setStatus(""); // Убираем адрес из статуса
         console.log("Contract set in state:", contractInstance);
         await fetchWalletBalance(provider, address);
      } catch (error) {
         console.error("Setup connection failed:", error);
         setStatus(`Failed to set up connection: ${error.message}`);
      }
   };

   const connectWallet = async () => {
      console.log("connectWallet called");
      if (!window.ethereum) {
         setStatus("Please install MetaMask");
         return;
      }

      try {
         const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
         if (accounts.length === 0) {
            setStatus("No accounts found. Please unlock MetaMask.");
            return;
         }
         await setupConnection();
      } catch (error) {
         setStatus(`Failed to connect wallet: ${error.message}`);
      }
   };

   const disconnectWallet = () => {
      setAccount(null);
      setProvider(null);
      setSigner(null);
      setContract(null);
      setChainId(null);
      setWalletBalance(null);
      setStatus("Disconnected. Please connect to MetaMask");
   };

   const checkConnectedAccounts = async () => {
      console.log("checkConnectedAccounts called");
      if (!window.ethereum) {
         setStatus("Please install MetaMask");
         return;
      }

      try {
         const accounts = await window.ethereum.request({ method: "eth_accounts" });
         console.log("Accounts:", accounts);
         if (accounts.length > 0) {
            await setupConnection();
         } else {
            setStatus("Please connect to MetaMask");
         }
      } catch (error) {
         setStatus(`Failed to check connected accounts: ${error.message}`);
      }
   };

   useEffect(() => {
      console.log("useWallet useEffect triggered");
      if (window.ethereum) {
         checkConnectedAccounts();
         window.ethereum.on("accountsChanged", (accounts) => {
            console.log("accountsChanged:", accounts);
            if (accounts.length > 0) {
               setupConnection();
            } else {
               disconnectWallet();
            }
         });
         window.ethereum.on("chainChanged", (newChainId) => {
            console.log("chainChanged:", newChainId);
            setChainId(Number(newChainId));
            setupConnection();
         });
         return () => {
            window.ethereum.removeListener("accountsChanged", () => { });
            window.ethereum.removeListener("chainChanged", () => { });
         };
      } else {
         setStatus("Please install MetaMask");
      }
   }, []);

   useEffect(() => {
      if (provider && account) {
         fetchWalletBalance(provider, account);
      }
   }, [provider, account]);

   return {
      provider,
      signer,
      contract,
      account,
      chainId,
      status,
      walletBalance,
      connectWallet,
      disconnectWallet,
      setStatus,
      fetchWalletBalance,
   };
};