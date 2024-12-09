"use client";

import { useState, useEffect, useCallback } from "react";
import { beginCell, toNano, Address } from "@ton/core";
import { useTonConnectUI } from "@tonconnect/ui-react";
import TonWeb from "tonweb";
import React from "react";
import { TonApiClient } from "@ton-api/client";
import {
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Card,
  CardMedia,
  CardContent,
  TextField,
  Modal,
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopy from "@mui/icons-material/ContentCopy";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
//import QRCode from "react-qr-code";

interface Jetton {
  name: string;
  symbol: string;
  image: string;
  address: Address;
  balance: string;
}

interface NftOwner {
  address: string;
  is_scam?: boolean;
}

interface NftMetadata {
  name: string;
  image: string;
}

interface NftCollection {
  address: string;
  owner?: NftOwner;
  metadata: NftMetadata;
  previews: { url: string }[];
}

interface Nft {
  address: string;
  owner: string;
  name: string;
  image: string;
  description: string;
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
  const [tonWalletAddress, setTonWalletAddress] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [jettons, setJettons] = useState<Jetton[]>([]);
  const [nftCollections, setNftCollections] = useState<NftCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null
  );
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [amountTON, setAmountTON] = useState<number | string>("");
  //  const [showQRCode, setShowQRCode] = useState(false);
  const [isTransactionSuccessful, setIsTransactionSuccessful] = useState<
    boolean | null
  >(null);
  const [selectedJetton, setSelectedJetton] = useState<string>(""); // Declare selectedJetton
  const [jettonRecipientAddress, setJettonRecipientAddress] =
    useState<string>("");
  const [jettonAmount, setJettonAmount] = useState<string>("");
  const [nfts, setNfts] = useState<any[]>([]); // State for NFTs
  const [selectedNft, setSelectedNft] = useState<Nft | null>(null); // Có thể null khi chưa chọn NFT nào

  // const [selectedNft, setSelectedNft] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiverAddress, setReceiverAddress] = useState(""); // For sending

  const handleWalletConnection = useCallback((address: string) => {
    setTonWalletAddress(address);
    console.log("Wallet connected successfully!");
    setIsLoading(false);
    fetchWalletBalance(address);
    fetchJettonsWallet(address);
    fetchNFTByAddress(address);
  }, []);

  const handleWalletDisconnection = useCallback(async () => {
    if (tonConnectUI.connected) {
      await tonConnectUI.disconnect();
      setTonWalletAddress("");
      setWalletBalance(null);
      setTransactionHash(null);
      console.log("Wallet disconnected successfully!");
      setIsLoading(false);
    } else {
      console.log("Wallet is not connected, no action taken.");
    }
    //fetchNFTByAddress();
  }, [tonConnectUI]);

  const handleOpenModal = (nft: any) => {
    setSelectedNft(nft);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedNft(null);
    setIsModalOpen(false);
  };

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
      // Parse the wallet address
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
          address: jetton.walletAddress.address || "",
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
      //const jettonWalletContract = Address.parse(se);
      console.log("jettonRecipientAddress", jettonRecipientAddress);
      console.log("selectedJetton", selectedJetton);
      // Create the forward payload (for optional comment or metadata)
      // const forwardPayload = beginCell()
      //   .storeUint(0, 32) // opcode for comment
      //   .storeStringTail("Jetton transfer from dApp") // Comment
      //   .endCell();

      // Build the Jetton transfer payload
      const body = beginCell()
        .storeUint(0xf8a7ea5, 32) // opcode for Jetton transfer
        .storeUint(0, 64) // query_id (optional transaction identifier)
        .storeCoins(toNano(jettonAmount)) // Amount of Jettons
        .storeAddress(destinationAddress) // Recipient address
        .storeAddress(Address.parse(tonWalletAddress))
        .storeUint(0, 1) // No custom payload
        .storeCoins(toNano("0.00000001")) // Transaction fees
        .storeUint(0, 1) // Forward payload stored as reference
        //        .storeRef(forwardPayload) // Include forwardPayload
        .endCell();

      // Define the transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // Transaction expires after 60 seconds
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

  const fetchNFTByAddress = async (walletAddress: string) => {
    try {
      const response = await fetch(
        `https://testnet.tonapi.io/v2/accounts/${walletAddress}/nfts`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data?.nft_items?.length > 0) {
        const nftList = data.nft_items.map((nft: any) => ({
          address: nft.address || "No address",
          owner: nft.owner?.address || "No owner address",
          name: nft.metadata?.name || "Unknown NFT",
          image: nft.metadata?.image || "https://via.placeholder.com/200",
          description: nft.metadata?.description || "No description available",
        }));

        setNfts(nftList); // Update state
      } else {
        console.log("No NFTs found for this wallet.");
        setNfts([]); // Clear NFTs in case there are none
      }
    } catch (error) {
      console.error("Failed to fetch NFTs:", error);
      setNfts([]); // Handle error case
    }
  };

  const transferNft = async () => {

    try {
      // Parse the recipient address and Jetton Wallet Contract
      const destinationAddressnft = Address.parse('0QBBt6Fi8upEMAbeJMI1j0RTR1FRerZZqVcLyqiPESu6C7YH');
      const nftWalletContract = Address.parse('kQAIGSUKUatUucN02kkvtdllv64vKj8LeO9yEAOSXYkbsGfO');
      console.log("jettonRecipientAddress", jettonRecipientAddress);

      // Build the Jetton transfer payload
      const body = beginCell()
        .storeUint(0x5fcc3d14, 32) // opcode for Jetton transfer
        .storeUint(0, 64) // query_id (optional transaction identifier)
        .storeAddress(destinationAddressnft) // Recipient address
        .storeAddress(Address.parse(tonWalletAddress))
        .storeUint(0, 1) // No custom payload
        .storeCoins(toNano("0.00000001")) // Transaction fees
        .storeUint(0, 1) // Forward payload stored as reference
        //        .storeRef(forwardPayload) // Include forwardPayload
        .endCell();

      // Define the transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // Transaction expires after 60 seconds
        messages: [
          {
            address: nftWalletContract.toString(), // Jetton Wallet Contract Address
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
        fetchNFTByAddress(tonWalletAddress);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tonWalletAddress]);

  // const handleCopyAddress = () => {
  //   if (tonWalletAddress) {
  //     navigator.clipboard.writeText(tonWalletAddress);
  //     setSnackbarOpen(true);
  //   }
  // };

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

  const sliceAddress = (address: string) => {
    try {
      const tonAddress = new TonWeb.utils.Address(address);
      const friendlyAddress = tonAddress.toString(true, true, false, true); // base64,...,Bounceable=true, testnet=true
      return `${friendlyAddress.slice(0, 4)}...${friendlyAddress.slice(-4)}`;
    } catch (error) {
      console.error("Invalid address format:", error);
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
  };

  const formatAddress = (address: string) => {
    try {
      const tonAddress = new TonWeb.utils.Address(address);
      const friendlyAddress = tonAddress.toString(true, true, false, true); // base64,...,Bounceable=true, testnet=true
      return friendlyAddress;
    } catch (error) {
      console.error("Invalid address format:", error);
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
  };

  // const handleShowQRCode = () => {
  //   setShowQRCode((prev) => !prev);
  // };

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
    <main className="flex flex-col min-h-screen">
      {/* Header Section */}
      <Box
        component="header"
        sx={{
          width: "100%",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
          borderBottom: "1px solid #ddd",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          NFT Marketplace
        </Typography>

        {/* Wallet Action */}
        <Button
          variant="contained"
          color="primary"
          onClick={handleWalletAction}
          disabled={isLoading}
        >
          {tonWalletAddress ? "Disconnect Wallet" : "Connect Wallet"}
        </Button>
      </Box>

      {/* Main Content Area */}
      {tonWalletAddress ? (
        // Wallet is connected — show full marketplace
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            height: "calc(100vh - 64px)",
          }}
        >
          {/* Left Side - NFTs Section */}
          <Box
            sx={{
              flex: 1,
              backgroundColor: "#f0f0f0",
              padding: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              overflowY: "auto",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Your NFTs
            </Typography>

            {nfts.length > 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                {nfts.map((nft, index) => (
                  <Box
                    key={index}
                    sx={{
                      flex: "1 1 calc(33.333% - 16px)", // Responsive design: 3 items per row
                      maxWidth: "calc(33.333% - 16px)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleOpenModal(nft)}
                  >
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={nft.image}
                        alt={nft.name}
                        sx={{
                          objectFit: "cover",
                        }}
                      />
                      <CardContent>
                        <Typography gutterBottom variant="h6" component="div">
                          {nft.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {nft.description || "No description available"}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography>No NFTs in Wallet.</Typography>
            )}
          </Box>
          <Modal
            open={isModalOpen}
            onClose={handleCloseModal}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: "300px",
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              }}
            >
              {selectedNft && (
                <>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {selectedNft.name}
                  </Typography>
                  <CardMedia
                    component="img"
                    height="200"
                    image={selectedNft.image}
                    alt={selectedNft.name}
                    sx={{
                      objectFit: "cover",
                      borderRadius: "8px",
                      mb: 2,
                    }}
                  />
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Description:</strong>{" "}
                    {selectedNft.description || "No description available"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Address:</strong>{" "}
                    {sliceAddress(selectedNft.address) || "No address"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Owner:</strong>{" "}
                    {sliceAddress(selectedNft.owner) || "No owner address"}
                  </Typography>
                  {/* Send Section */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Send to:</strong>
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Enter receiver's address"
                      value={receiverAddress}
                      onChange={(e) => setReceiverAddress(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => transferNft()}
                    >
                      Send
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </Modal>
          {/* Right Side - Wallet & Jettons Info Section */}
          <Box
            sx={{
              flex: 1,
              backgroundColor: "#ffffff",
              padding: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              overflowY: "auto",
            }}
          >
            {/* Wallet Information */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Wallet Information
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="body1" gutterBottom sx={{ flex: 1 }}>
                <strong>Wallet Address:</strong>{" "}
                {sliceAddress(tonWalletAddress)}
              </Typography>
              <Tooltip title="Copy Address">
                <IconButton
                  onClick={() =>
                    navigator.clipboard.writeText(
                      formatAddress(tonWalletAddress)
                    )
                  }
                  sx={{ marginLeft: 1 }}
                >
                  <ContentCopy />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body1" gutterBottom>
              <strong>Wallet Balance:</strong> {walletBalance} TON
            </Typography>

            {/* Jetton List */}
            <Typography variant="h6" sx={{ mt: 3 }}>
              Your Jettons
            </Typography>
            {jettons.length > 0 ? (
              <List>
                {jettons.map((jetton, index) => (
                  <ListItem
                    key={index}
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <img
                      src={jetton.image}
                      alt={jetton.name}
                      style={{
                        width: 40,
                        height: 40,
                        marginRight: 10,
                      }}
                    />
                    <ListItemText
                      primary={`${jetton.name} (${jetton.symbol})`}
                      secondary={`Balance: ${jetton.balance}`}
                    />
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        setSelectedJetton(jetton.address.toString());
                        setJettonRecipientAddress(""); // Reset form
                        setJettonAmount("");
                        setTransactionStatus(null); // Clear previous transaction messages
                      }}
                    >
                      Send
                    </Button>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No Jettons in Wallet.</Typography>
            )}
            <Modal
              open={!!selectedJetton} // Modal opens if a jetton is selected
              onClose={() => setSelectedJetton("")} // Close modal on overlay click
              aria-labelledby="transfer-jetton-title"
              aria-describedby="transfer-jetton-description"
            >
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 400,
                  bgcolor: "background.paper",
                  boxShadow: 24,
                  p: 4,
                  borderRadius: "8px",
                }}
              >
                <Typography
                  id="transfer-jetton-title"
                  variant="h6"
                  component="h2"
                  gutterBottom
                >
                  Transfer Jetton
                </Typography>
                <Typography id="transfer-jetton-description" sx={{ mb: 2 }}>
                  Please enter the recipient address and amount to transfer.
                </Typography>
                <TextField
                  label="Recipient Address"
                  variant="outlined"
                  fullWidth
                  value={jettonRecipientAddress}
                  onChange={(e) => setJettonRecipientAddress(e.target.value)}
                  margin="normal"
                />
                <TextField
                  label="Amount"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={jettonAmount}
                  onChange={(e) => setJettonAmount(e.target.value)}
                  margin="normal"
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={transferJetton}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Transfer
                </Button>
                {transactionStatus && (
                  <Typography
                    sx={{
                      mt: 2,
                      color: isTransactionSuccessful ? "green" : "red",
                    }}
                  >
                    {transactionStatus}
                  </Typography>
                )}
              </Box>
            </Modal>
            {/* Transfer Section */}
            <Typography variant="h6" sx={{ mt: 3 }}>
              Transfer TON
            </Typography>
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
              <Typography
                sx={{
                  mt: 2,
                  color: isTransactionSuccessful ? "green" : "red",
                }}
              >
                {transactionStatus}
              </Typography>
            )}
            {/* {transactionHash && (
  <Typography
    sx={{
      mt: 1,
      color: "blue",
      cursor: "pointer",
      textDecoration: "underline",
    }}
    onClick={() =>
      window.open(
        `https://testnet.tonscan.org/tx/${transactionHash}`,
        "_blank"
      )
    }
  >
    View Transaction on Explorer
  </Typography>
)} */}
          </Box>
        </Box>
      ) : (
        // Wallet is NOT connected — show only centered message
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "calc(100vh - 64px)",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: "linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)",
              fontWeight: "bold",
              transition: "transform 0.3s ease, color 0.3s ease",
              "&:hover": {
                transform: "scale(1.1)",
                color: "#ff9800",
              },
            }}
          >
            Welcome to NFTs Marketplace
          </Typography>
        </Box>
      )}
    </main>
  );
}
