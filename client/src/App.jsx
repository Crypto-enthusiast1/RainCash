import React, { useEffect, useState } from "react";
import { useWallet } from "./hooks/useWallet";
import { useMixer } from "./hooks/useMixer";
import { copyDepositNote, extractSecretForDisplay } from "./utils/depositNote";
import RainEffect from "./components/RainEffect";
import { SUPPORTED_CHAINS } from "./constants";
import "./styles/GlobalStyles.css";
import "./styles/CardStyles.css";
import "./styles/ComponentStyles.css";

function App() {
   const {
      provider,
      contract,
      account,
      chainId,
      status,
      walletBalance,
      connectWallet,
      disconnectWallet,
      setStatus,
      fetchWalletBalance,
   } = useWallet();

   console.log("App.jsx - Contract before passing to useMixer:", contract);

   const {
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
      denominations,
      poolStats,
      handleDeposit,
      handleWithdraw,
   } = useMixer(contract, setStatus, fetchWalletBalance, provider, account, chainId);

   const [activeTab, setActiveTab] = useState("deposit");

   const fixedDenominations = [0.1, 1, 5, 10, 100];

   useEffect(() => {
      if (contract) {
         fetchFeePercentage().catch((error) => {
            console.error("Error fetching fee percentage:", error);
            setStatus("Failed to fetch fee percentage. Please check your network or contract deployment.");
         });
      }
   }, [contract, fetchFeePercentage, setStatus]);

   const handleSliderChange = (index) => {
      const selectedValue = fixedDenominations[index];
      setSelectedDenomination(selectedValue);
   };

   const filledWidth = selectedDenomination
      ? (fixedDenominations.indexOf(selectedDenomination) / (fixedDenominations.length - 1)) * 100
      : 0;

   // Функция для форматирования времени
   const formatTimeAgo = (timestamp) => {
      const now = new Date();
      const depositTime = new Date(timestamp);
      const diffInSeconds = Math.floor((now - depositTime) / 1000);

      if (diffInSeconds < 60) {
         return `${diffInSeconds} секунд назад`;
      } else if (diffInSeconds < 3600) {
         const minutes = Math.floor(diffInSeconds / 60);
         return `${minutes} минут${minutes === 1 ? "а" : minutes >= 2 && minutes <= 4 ? "ы" : ""} назад`;
      } else if (diffInSeconds < 86400) {
         const hours = Math.floor(diffInSeconds / 3600);
         return `${hours} час${hours === 1 ? "" : hours >= 2 && hours <= 4 ? "а" : "ов"} назад`;
      } else {
         const days = Math.floor(diffInSeconds / 86400);
         return `${days} день${days === 1 ? "" : days >= 2 && days <= 4 ? "я" : "ей"} назад`;
      }
   };

   return (
      <div className="app-wrapper">
         <div className="background-container">
            <RainEffect />
         </div>
         {account && (
            <div style={{ position: "absolute", top: "20px", right: "20px", textAlign: "right" }}>
               <button onClick={disconnectWallet} className="button disconnect-button">
                  Disconnect
               </button>
               <p className="wallet-address">
                  Connected: {account.slice(0, 6)}...{account.slice(-4)}
               </p>
            </div>
         )}
         <div className="app-container" style={{ display: "flex", gap: "20px" }}>
            {/* Основное окно (Депозит/Вывод) */}
            <div className="card" style={{ flex: "1", minWidth: "400px" }}>
               <div className="card-header">
                  <h1 className="title">Crypto Mixer</h1>
               </div>
               <p className="status">{status}</p>
               {chainId && (
                  <p className="network-info">
                     Network: {SUPPORTED_CHAINS[chainId]} (Chain ID: {chainId})
                  </p>
               )}
               {contractBalance !== null && (
                  <p className="contract-balance">
                     Contract Balance: {contractBalance} ETH
                  </p>
               )}
               {feePercentage > 0 && (
                  <p className="fee-info">Service Fee: {feePercentage}%</p>
               )}

               {!account ? (
                  <button onClick={connectWallet} className="button connect-button">
                     Connect Wallet
                  </button>
               ) : (
                  <div>
                     <div className="tabs">
                        <button
                           className={`tab ${activeTab === "deposit" ? "active" : ""}`}
                           onClick={() => setActiveTab("deposit")}
                        >
                           Deposit
                        </button>
                        <button
                           className={`tab ${activeTab === "withdraw" ? "active" : ""}`}
                           onClick={() => setActiveTab("withdraw")}
                        >
                           Withdraw
                        </button>
                     </div>

                     {activeTab === "deposit" && (
                        <div className="section">
                           <h2 className="section-title">Deposit</h2>
                           <div className="input-group">
                              <select
                                 value={selectedToken}
                                 onChange={(e) => setSelectedToken(e.target.value)}
                                 className="input"
                              >
                                 <option value="ETH">ETH</option>
                              </select>
                              <p className="wallet-balance">
                                 Доступно: {walletBalance !== null ? `${walletBalance} ETH` : "Loading..."}
                              </p>
                              <div className="slider-container">
                                 <div className="denomination-slider">
                                    <div className="custom-slider">
                                       <div className="slider-track" />
                                       <div
                                          className="slider-filled"
                                          style={{ width: `${filledWidth}%` }}
                                       />
                                    </div>
                                    <div className="circle-overlay">
                                       {fixedDenominations.map((denom, index) => (
                                          <div
                                             key={index}
                                             className={`circle ${fixedDenominations.indexOf(selectedDenomination) >= index
                                                   ? "filled"
                                                   : ""
                                                }`}
                                             style={{
                                                left: `${(index / (fixedDenominations.length - 1)) * 100}%`,
                                             }}
                                             onClick={() => handleSliderChange(index)}
                                          />
                                       ))}
                                    </div>
                                    <div className="slider-labels">
                                       {fixedDenominations.map((denom, index) => (
                                          <span
                                             key={index}
                                             className={`slider-label ${selectedDenomination === denom ? "active" : ""
                                                }`}
                                          >
                                             {denom} ETH
                                          </span>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                              <button
                                 onClick={() => handleDeposit(chainId)}
                                 className="button deposit-button"
                              >
                                 Deposit
                              </button>
                           </div>
                           {depositNote && (
                              <div className="deposit-note">
                                 <p>Deposit Note: {extractSecretForDisplay(depositNote)}</p>
                                 <button
                                    onClick={() => copyDepositNote(depositNote, setStatus)}
                                    className="button copy-button"
                                 >
                                    Copy Note
                                 </button>
                                 <p className="note-warning">
                                    Save this note! You'll need it to withdraw your funds.
                                 </p>
                              </div>
                           )}
                        </div>
                     )}

                     {activeTab === "withdraw" && (
                        <div className="section">
                           <h2 className="section-title">Withdraw</h2>
                           <div className="input-group">
                              <input
                                 type="text"
                                 placeholder="Deposit Note (mixer-<secret>-<chainId>)"
                                 value={withdrawSecret}
                                 onChange={(e) => {
                                    setWithdrawSecret(e.target.value);
                                    setWithdrawNoteError("");
                                 }}
                                 className={`input ${withdrawNoteError ? "input-error" : ""}`}
                              />
                              {withdrawNoteError && (
                                 <p className="error-message">{withdrawNoteError}</p>
                              )}
                              <input
                                 type="text"
                                 placeholder="Withdraw Address"
                                 value={withdrawAddress}
                                 onChange={(e) => setWithdrawAddress(e.target.value)}
                                 className="input"
                              />
                              <button onClick={handleWithdraw} className="button withdraw-button">
                                 Withdraw
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>

            {/* Окно с историей депозитов */}
            {account && (
               <div className="card" style={{ flex: "1", minWidth: "300px", maxHeight: "500px", overflowY: "auto" }}>
                  <div className="section">
                     <h2 className="section-title">All Deposits</h2>
                     {allDeposits.length > 0 ? (
                        <div className="transaction-history">
                           {allDeposits.map((deposit, index) => (
                              <div key={index} className="transaction-item">
                                 <p>
                                    <strong>Amount:</strong> {deposit.denomination} ETH
                                 </p>
                                 <p>
                                    <strong>Timestamp:</strong> {formatTimeAgo(deposit.timestamp)}
                                 </p>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <p>No deposits yet.</p>
                     )}
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}

export default App;