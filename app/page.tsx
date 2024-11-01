"use client";

import { useState, useEffect, useCallback } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import TonWeb from "tonweb";
import React from "react";
import {
  Button,
  Typography,
  Box,
  Snackbar,
  TextField,
  IconButton,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import QRCode from "react-qr-code";

const tonWeb = new TonWeb(
  new TonWeb.HttpProvider("https://testnet.toncenter.com/api/v2/jsonRPC", {
    apiKey: "fdb0748fee7c4c05f66e5041d58473e0d2460242bcda0c2f3673b433d6647abe", // Ensure to replace with your API key
  })
);

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// Define the interface for Jetton balances
interface JettonBalance {
  address: string;
  symbol: string;
  balance: number;
}

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [jettonBalances, setJettonBalances] = useState<JettonBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null
  );
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [transactionInfo, setTransactionInfo] = useState<any>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [amountTON, setAmountTON] = useState<number | string>("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [isTransactionSuccessful, setIsTransactionSuccessful] = useState<
    boolean | null
  >(null);
  const [isTransactionInfoNotFound, setIsTransactionInfoNotFound] =
    useState(false);

  const handleWalletConnection = useCallback((address: string) => {
    setTonWalletAddress(address);
    console.log("Wallet connected successfully!");
    setIsLoading(false);
    fetchWalletBalance(address);
    //fetchJettonBalances(address).then(setJettonBalances);
  }, []);

  const handleWalletDisconnection = useCallback(async () => {
    if (tonConnectUI.connected) {
      await tonConnectUI.disconnect();
      setTonWalletAddress(null);
      setWalletBalance(null);
      setJettonBalances([]);
      setTransactionHash(null);
      setTransactionInfo(null);
      console.log("Wallet disconnected successfully!");
      setIsLoading(false);
    } else {
      console.log("Wallet is not connected, no action taken.");
    }
  }, [tonConnectUI]);

  const fetchWalletBalance = async (address: string) => {
    try {
      const walletAddress = new TonWeb.utils.Address(address);
      const balance = await tonWeb.getBalance(walletAddress);
      const balanceInTON = Number(balance) / 1e9;
      setWalletBalance(balanceInTON);
    } catch (error) {
      console.error("Failed to retrieve balance:", error);
    }
  };

  const fetchAllTokensBalances = async (address: string) => {
    try {
      const response = await fetch(
        `https://testnet.toncenter.com/api/v2/getJettons?address=${address}&api_key=fdb0748fee7c4c05f66e5041d58473e0d2460242bcda0c2f3673b433d6647abe`
      );

      // Check if the response is okay
      if (!response.ok) {
        console.error(
          `Error fetching tokens: ${response.status} ${response.statusText}`
        );
        return;
      }

      const data = await response.json();

      // if (data.result && Array.isArray(data.result)) {
      //   const tokenBalances = await Promise.all(
      //     data.result.map(async (token: any) => {
      //       const jettonAddress = token.jetton_master;
      //       const jettonContract = tonWeb.jetton.create(jettonAddress);
      //       const balance = await jettonContract.getBalance(address);
      //       return {
      //         address: jettonAddress,
      //         symbol: token.symbol || "Unknown",
      //         balance: Number(balance) / 1e9,
      //       };
      //     })
      //   );

      //   setJettonBalances(tokenBalances);
      // }
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    }
  };

  // Step 2: Call this function in `useEffect` when wallet connects
  useEffect(() => {
    if (tonWalletAddress) {
      fetchAllTokensBalances(tonWalletAddress);
    }
  }, [tonWalletAddress]);

  // Step 3: Render each token’s balance in the UI
  {
    jettonBalances.length > 0 && (
      <div>
        <Typography variant="h6">Token Balances:</Typography>
        <ul>
          {jettonBalances.map((token) => (
            <li key={token.address}>
              {token.symbol}: {token.balance}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const handleCopyAddress = () => {
    if (tonWalletAddress) {
      navigator.clipboard.writeText(tonWalletAddress);
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (tonConnectUI.account?.address) {
        handleWalletConnection(tonConnectUI.account?.address);
      } else {
        handleWalletDisconnection();
      }
    };

    checkWalletConnection();

    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        handleWalletConnection(wallet.account.address);
      } else {
        handleWalletDisconnection();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI, handleWalletConnection, handleWalletDisconnection]);

  const handleWalletAction = async () => {
    if (tonConnectUI.connected) {
      setIsLoading(true);
      await handleWalletDisconnection();
    } else {
      await tonConnectUI.openModal();
    }
  };

  const transferWithHashRetrieval = async () => {
    const amount = parseFloat(amountTON as string);
    if (!recipientAddress || isNaN(amount)) {
      setTransactionStatus("Invalid input");
      return;
    }

    const amountInNanoTON = TonWeb.utils.toNano(amount.toString());
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [
        {
          address: recipientAddress,
          amount: amountInNanoTON.toString(),
          payload: "",
        },
      ],
    };

    try {
      const response = await tonConnectUI.sendTransaction(transaction);
      console.log("Transaction response:", response);

      setTransactionStatus("Transaction in progress...");

      // Add a slight delay before fetching the transaction hash
      setTimeout(() => {
        fetchTransactionHash();
      }, 5000); // Adjust the delay as necessary
    } catch (error) {
      console.error("Failed to execute TON transfer:", error);
      setTransactionStatus("Transaction failed.");
      setIsTransactionSuccessful(false);
    }
  };

  const fetchTransactionHash = async (retries = 5, delay = 2000) => {
    try {
      const url = `https://testnet.toncenter.com/api/v2/getTransactions?address=${tonWalletAddress}&limit=1&api_key=fdb0748fee7c4c05f66e5041d58473e0d2460242bcda0c2f3673b433d6647abe`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.result.length > 0) {
        const hash = data.result[0].transaction_id.hash;
        setTransactionHash(hash);
        setTransactionStatus("Transaction successful!");
        setIsTransactionSuccessful(true);
        fetchTransactionInfo(hash);
      } else {
        if (retries > 0) {
          console.log(`Retrying... (${retries} attempts left)`);
          setTimeout(() => fetchTransactionHash(retries - 1, delay), delay);
        } else {
          setTransactionStatus(
            "Transaction completed, but hash could not be retrieved."
          );
          setIsTransactionSuccessful(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch transaction hash:", error);
      setTransactionStatus(
        "Transaction successful, but hash retrieval failed."
      );
      setIsTransactionSuccessful(false);
    }
  };

  const fetchTransactionInfo = async (hash: string) => {
    try {
      if (!tonWalletAddress) {
        throw new Error(
          "Wallet address is required to fetch transaction info."
        );
      }

      if (!hash || typeof hash !== "string") {
        throw new Error("Invalid transaction hash.");
      }

      const url = `https://testnet.toncenter.com/api/v2/getTransactions?address=${tonWalletAddress}&limit=1&hash=${hash}&api_key=fdb0748fee7c4c05f66e5041d58473e0d2460242bcda0c2f3673b433d6647abe`;
      console.log("Fetching transaction info from URL:", url);

      const res = await fetch(url);
      const data = await res.json();

      console.log("Transaction Info Response:", data); // Log response

      if (
        data.ok &&
        data.result &&
        Array.isArray(data.result) &&
        data.result.length > 0
      ) {
        const txInfo = data.result[0];

        // Check if in_message exists before accessing its properties
        const inMessage = txInfo.in_message || {};
        const amount = parseFloat(inMessage.value) / 1e9; // Ensure amount is a number
        const timestamp = txInfo.created_at
          ? new Date(txInfo.created_at * 1000).toLocaleString()
          : "Invalid Date"; // Handle date conversion

        setTransactionInfo({
          from: inMessage.from || "Unknown",
          to: inMessage.to || "Unknown",
          amount: !isNaN(amount) ? `${amount} TON` : "Invalid Amount", // Fallback for NaN
          status: txInfo.status || "Unknown",
          timestamp: timestamp,
          fee: `${Number(txInfo.fee) / 1e9} TON`, // Ensure fee is formatted correctly
          logicalTime: txInfo.logical_time || "N/A", // Fallback for logical time
        });

        setTransactionStatus("Transaction info retrieved successfully!");
        setIsTransactionInfoNotFound(false); // Reset the not found state
      } else {
        setTransactionStatus("Transaction info not found.");
        setIsTransactionInfoNotFound(true); // Set the not found state
      }
    } catch (error) {
      console.error("Failed to fetch transaction info:", error);
      setTransactionStatus("Failed to retrieve transaction info.");
      setIsTransactionInfoNotFound(true);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleShowQRCode = () => {
    setShowQRCode((prev) => !prev);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">TON Connect</h1>
      {tonWalletAddress ? (
        <div>
          <Typography variant="h6" gutterBottom>
            Connected Wallet: {formatAddress(tonWalletAddress)}
            <IconButton
              onClick={handleCopyAddress}
              color="primary"
              style={{ marginLeft: "10px" }}
            >
              <ContentCopyIcon />
            </IconButton>
            <Button
              variant="contained"
              color="error"
              onClick={handleWalletDisconnection}
              style={{ marginLeft: "10px" }}
            >
              Disconnect Wallet
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleShowQRCode}
              style={{ marginLeft: "10px" }}
            >
              {showQRCode ? "Hide QR Code" : "Show QR Code"}
            </Button>
          </Typography>
          {showQRCode && (
            <Box my={2}>
              <QRCode value={tonWalletAddress} />
            </Box>
          )}
          <Typography variant="body1" gutterBottom>
            Wallet Balance: {walletBalance} TON
          </Typography>
          {jettonBalances.length > 0 && (
            <div>
              <Typography variant="h6">Jetton Balances:</Typography>
              <ul>
                {jettonBalances.map((jetton) => (
                  <li key={jetton.address}>
                    {jetton.symbol}: {jetton.balance}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <TextField
            label="Recipient Address"
            variant="outlined"
            fullWidth
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            margin="normal"
          />
          <TextField
            label="Amount in TON"
            variant="outlined"
            fullWidth
            type="number"
            value={amountTON}
            onChange={(e) => setAmountTON(e.target.value)}
            margin="normal"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={transferWithHashRetrieval}
            style={{ marginTop: "10px" }}
          >
            Transfer TON
          </Button>
          {transactionStatus && (
            <Alert
              severity={
                isTransactionSuccessful
                  ? "success"
                  : isTransactionInfoNotFound
                  ? "error"
                  : "info"
              }
              sx={{ mt: 2 }}
            >
              {transactionStatus}
            </Alert>
          )}

          {transactionHash && (
            <Typography variant="body1" gutterBottom>
              Transaction Hash: {transactionHash}
            </Typography>
          )}
          {transactionInfo && (
            <div>
              <Typography variant="h6">Transaction Info:</Typography>
              <Typography variant="body1">
                From: {transactionInfo.from}
              </Typography>
              <Typography variant="body1">To: {transactionInfo.to}</Typography>
              <Typography variant="body1">
                Amount: {transactionInfo.amount}
              </Typography>
              <Typography variant="body1">
                Status: {transactionInfo.status}
              </Typography>
              <Typography variant="body1">
                Timestamp: {transactionInfo.timestamp}
              </Typography>
              <Typography variant="body1">
                Fee: {transactionInfo.fee}
              </Typography>
              <Typography variant="body1">
                Logical Time: {transactionInfo.logicalTime}
              </Typography>
            </div>
          )}
        </div>
      ) : (
        <Button variant="contained" onClick={handleWalletAction}>
          Connect Wallet
        </Button>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success">
          Address copied to clipboard!
        </Alert>
      </Snackbar>
    </main>
  );
}
