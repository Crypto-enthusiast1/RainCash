import { ethers } from "ethers";

export const generateSecret = () => {
   const randomBytes = ethers.randomBytes(32);
   return ethers.hexlify(randomBytes);
};

export const generateDepositNote = (secret, chainId) => {
   return `mixer-${secret}-${chainId}`;
};

export const extractSecretForDisplay = (note) => {
   return note;
};

export const extractSecretFromNote = (note) => {
   const parts = note.split("-");
   if (parts.length < 3 || parts[0] !== "mixer") {
      throw new Error("Invalid Deposit Note format. Expected: mixer-<secret>-<chainId>");
   }
   const secret = parts[1];
   if (!secret || secret.trim() === "") {
      throw new Error("Invalid secret in Deposit Note");
   }
   return secret;
};

export const validateWithdrawNote = (note, setWithdrawNoteError) => {
   try {
      extractSecretFromNote(note);
      setWithdrawNoteError("");
      return true;
   } catch (error) {
      setWithdrawNoteError(error.message);
      return false;
   }
};

export const copyDepositNote = (depositNote, setStatus) => {
   navigator.clipboard.writeText(depositNote).then(() => {
      setStatus("Deposit Note copied to clipboard!");
   }).catch((error) => {
      setStatus(`Failed to copy Deposit Note: ${error.message}`);
   });
};