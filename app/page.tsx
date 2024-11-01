"use client";

import { useState, useEffect, useCallback } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import TonWeb from "tonweb";
import React from 'react';
import { Button, Typography, Box, Snackbar, TextField } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MuiAlert, { AlertProps } from '@mui/material/Alert';

const tonWeb = new TonWeb(new TonWeb.HttpProvider("https://testnet.toncenter.com/api/v2/jsonRPC", {
  apiKey: "fdb0748fee7c4c05f66e5041d58473e0d2460242bcda0c2f3673b433d6647abe"
}));

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [amountTON, setAmountTON] = useState<number | string>('');

  const handleWalletConnection = useCallback((address: string) => {
    setTonWalletAddress(address);
    console.log("Wallet connected successfully!");
    setIsLoading(false);
    fetchWalletBalance(address);
  }, []);

  const handleWalletDisconnection = useCallback(() => {
    setTonWalletAddress(null);
    setWalletBalance(null);
    console.log("Wallet disconnected successfully!");
    setIsLoading(false);
  }, []);

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
      await tonConnectUI.disconnect();
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

    // Tạo yêu cầu giao dịch
    const amountInNanoTON = TonWeb.utils.toNano(amount.toString());
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60, // Thời gian hết hạn giao dịch
      messages: [
        {
          address: recipientAddress,
          amount: amountInNanoTON.toString(),
          payload: "", // Để trống nếu không có payload đặc biệt
        },
      ],
    };

    try {
      // Gửi yêu cầu giao dịch qua TonConnect UI
      const response = await tonConnectUI.sendTransaction(transaction);
      console.log("Transaction response:", response);
      setTransactionStatus("Transaction in progress...");
    } catch (error) {
      console.error("Failed to execute TON transfer:", error);
      setTransactionStatus("Transaction failed.");
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
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
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h6" className="mb-4">
            Connected: {formatAddress(tonWalletAddress)}
            <Button onClick={handleCopyAddress} size="small" color="primary" startIcon={<ContentCopyIcon />} style={{ marginLeft: "8px" }}>
              Copy
            </Button>
          </Typography>
          <Typography variant="h6" className="mb-4">
            Balance: {walletBalance !== null ? `${walletBalance} TON` : "Loading..."}
          </Typography>
          <TextField
            label="Recipient Address"
            variant="outlined"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Amount (TON)"
            variant="outlined"
            type="number"
            value={amountTON}
            onChange={(e) => setAmountTON(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button onClick={transferWithHashRetrieval} variant="contained" color="primary">
            Transfer TON
          </Button>
          <Typography variant="body2" style={{ marginTop: '8px' }}>
            Transaction Status: {transactionStatus || "No transaction"}
          </Typography>
          <Button onClick={handleWalletAction} variant="contained" color="error" style={{ marginTop: '16px' }}>
            Disconnect Wallet
          </Button>
        </Box>
      ) : (
        <Button onClick={handleWalletAction} variant="contained" color="primary">
          Connect TON Wallet
        </Button>
      )}
      <Snackbar open={snackbarOpen} autoHideDuration={2000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="success">
          Address copied to clipboard!
        </Alert>
      </Snackbar>
    </main>
  );
}
