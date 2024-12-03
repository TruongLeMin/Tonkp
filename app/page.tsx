"use client";

import { useState, useEffect, useCallback } from "react";
import { beginCell, toNano, Address } from "@ton/core";
import { useTonConnectUI } from "@tonconnect/ui-react";
import TonWeb from "tonweb";
import React from "react";
import { TonApiClient } from "@ton-api/client";
import {
  Button,
  Typography,
  Box,
  Snackbar,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import QRCode from "react-qr-code";
import MenuItem from "@mui/material/MenuItem"; // Import MenuItem

interface Jetton {
  name: string;
  symbol: string;
  image: string;
  address: Address;
  balance: string;
}

const tonWeb = new TonWeb(
  new TonWeb.HttpProvider("https://testnet.toncenter.com/api/v2/jsonRPC", {
    apiKey: "fdb0748fee7c4c05f66e5041d58473e0d2460242bcda0c2f3673b433d6647abe",
  })
);

const ta = new TonApiClient({
  baseUrl: "https://testnet.tonapi.io",
  apiKey: "",
});

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [jettons, setJettons] = useState<Jetton[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null
  );
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [amountTON, setAmountTON] = useState<number | string>("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [isTransactionSuccessful, setIsTransactionSuccessful] = useState<
    boolean | null
  >(null);
  const [selectedJetton, setSelectedJetton] = useState<string>(""); // Declare selectedJetton
  const [jettonRecipientAddress, setJettonRecipientAddress] =
    useState<string>("");
  const [jettonAmount, setJettonAmount] = useState<string>("");

  const handleWalletConnection = useCallback((address: string) => {
    setTonWalletAddress(address);
    console.log("Wallet connected successfully!");
    setIsLoading(false);
    fetchWalletBalance(address);
    fetchJettonsWallet(address);
  }, []);

  const handleWalletDisconnection = useCallback(async () => {
    if (tonConnectUI.connected) {
      await tonConnectUI.disconnect();
      setTonWalletAddress(null);
      setWalletBalance(null);
      setTransactionHash(null);
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

  const fetchJettonsWallet = async (walletAddress: string) => {
    try {
      // Parse the wallet address to ensure it's valid
      const parsedAddress = Address.parse(walletAddress);

      // Fetch Jetton balances using tonapi SDK
      const res = await ta.accounts.getAccountJettonsBalances(parsedAddress);

      if (res.balances && Array.isArray(res.balances)) {
        // Map the jettons into a simplified format
        const jettonList = res.balances.map((jetton) => ({
          name: jetton.jetton.name || "Unknown Jetton",
          symbol: jetton.jetton.symbol || "N/A",
          balance: (Number(jetton.balance) / 1e9).toFixed(2),
          image: jetton.jetton.image || "",
          address: jetton.jetton.address || "",
        }));

        // Update the state or return the jetton list
        setJettons(jettonList);
      } else {
        console.error("No jettons found in wallet.");
      }
    } catch (error) {
      console.error("Failed to fetch jettons in wallet:", error);
    }
  };

  const transferJetton = async () => {
    if (!selectedJetton || !jettonRecipientAddress || !jettonAmount) {
      setTransactionStatus("Please fill all fields.");
      return;
    }

    try {
      // Parse the recipient address and Jetton Wallet Contract
      const destinationAddress = Address.parse(jettonRecipientAddress);
      const jettonWalletContract = Address.parse(selectedJetton);

      console.log("jettonRecipientAddress", jettonRecipientAddress);
      console.log("selectedJetton", selectedJetton);
      // Create the forward payload (for optional comment or metadata)
      const forwardPayload = beginCell()
        .storeUint(0, 32) // opcode for comment
        .storeStringTail("Jetton transfer from dApp") // Comment
        .endCell();

      // Build the Jetton transfer payload
      const body = beginCell()
        .storeUint(0xf8a7ea5, 32) // opcode for Jetton transfer
        .storeUint(0, 64) // query_id (optional transaction identifier)
        .storeCoins(toNano(jettonAmount)) // Amount of Jettons
        .storeAddress(destinationAddress) // Recipient address
        .storeAddress(
          Address.parse(
            "0:0000000000000000000000000000000000000000000000000000000000000000"
          )
        ) // Response address
        .storeBit(0) // No custom payload
        .storeCoins(toNano("0.02")) // Transaction fees
        .storeBit(1) // Forward payload stored as reference
        .storeRef(forwardPayload) // Include forwardPayload
        .endCell();

      // Define the transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360, // Transaction expires after 360 seconds
        messages: [
          {
            address: jettonWalletContract.toString(), // Jetton Wallet Contract Address
            amount: toNano("0.05").toString(), // Network fees for transaction
            payload: body.toBoc().toString("base64"), // Encoded payload
          },
        ],
      };

      // Send the transaction using TonConnectUI
      await tonConnectUI.sendTransaction(transaction);
      setTransactionStatus("Jetton transaction sent successfully!");
      setIsTransactionSuccessful(true);
    } catch (error) {
      console.error("Jetton transfer failed:", error);
      setTransactionStatus(
        "Jetton transfer failed. Check the console for details."
      );
      setIsTransactionSuccessful(false);
    }
  };

  // load so du 5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (tonWalletAddress) {
        fetchWalletBalance(tonWalletAddress);
        fetchJettonsWallet(tonWalletAddress);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tonWalletAddress]);

  const handleCopyAddress = () => {
    if (tonWalletAddress) {
      navigator.clipboard.writeText(tonWalletAddress);
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (tonConnectUI.account?.address) {
          handleWalletConnection(tonConnectUI.account?.address);
        } else {
          handleWalletDisconnection();
        }
      } catch (error) {
        console.error("Error during wallet connection check:", error);
      } finally {
        setIsLoading(false); // Đảm bảo trạng thái được cập nhật
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
    if (!recipientAddress || isNaN(amount) || amount <= 0) {
      setTransactionStatus("Invalid amount");
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

      if (data.result && data.result.length > 0) {
        const hash = data.result[0].transaction_id.hash;
        setTransactionHash(hash);
        setTransactionStatus("Transaction successful!");
        setIsTransactionSuccessful(true);
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

  const formatAddress = (address: string) => {
    try {
      const tonAddress = new TonWeb.utils.Address(address);
      // false for non-bounceable
      const friendlyAddress = tonAddress.toString(true, true, false, true); // base64,...,Bounceable=true, testnet=true
      return `${friendlyAddress.slice(0, 4)}...${friendlyAddress.slice(-4)}`;
    } catch (error) {
      console.error("Invalid address format:", error);
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
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
          {/* Hiển thị danh sách Jetton */}
          <h4>Your List Jettons</h4>
          {jettons.length > 0 ? (
            <List>
              {jettons.map((jetton, index) => (
                <ListItem key={index}>
                  <img
                    src={jetton.image}
                    alt={jetton.name}
                    style={{ width: 50, height: 50, marginRight: 10 }}
                  />
                  <ListItemText
                    primary={`${jetton.name} (${jetton.symbol})`}
                    secondary={`Balance: ${jetton.balance}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>No Jettons in Wallet.</Typography>
          )}
          <div>
            <Typography variant="h6">Transfer Jettons</Typography>
            <TextField
              label="Select Jetton"
              select
              fullWidth
              value={selectedJetton}
              onChange={(e) => setSelectedJetton(e.target.value)}
              margin="normal"
            >
              {jettons.map((jetton) => (
                <MenuItem
                  key={jetton.address.toString()}
                  value={jetton.address.toString()}
                >
                  {jetton.name} ({jetton.symbol})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Recipient Address"
              fullWidth
              value={jettonRecipientAddress}
              onChange={(e) => setJettonRecipientAddress(e.target.value)}
              margin="normal"
            />
            <TextField
              label="Amount"
              fullWidth
              value={jettonAmount}
              onChange={(e) => setJettonAmount(e.target.value)}
              margin="normal"
            />
            <Button
              variant="contained"
              color="primary"
              onClick={transferJetton}
              style={{ marginTop: "10px" }}
            >
              Transfer Jetton
            </Button>
            {transactionStatus && (
              <Alert
                severity={isTransactionSuccessful ? "success" : "error"}
                sx={{ mt: 2 }}
              >
                {transactionStatus}
              </Alert>
            )}
          </div>

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
              severity={isTransactionSuccessful ? "success" : "info"}
              sx={{ mt: 2 }}
            >
              {transactionStatus}
            </Alert>
          )}
          {/* {transactionHash && (
            <Typography variant="body1" gutterBottom>
              Transaction Hash: {transactionHash}
            </Typography>
          )} */}
        </div>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={handleWalletAction}
        >
          Connect Wallet
        </Button>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          Address copied!
        </Alert>
      </Snackbar>
    </main>
  );
}
