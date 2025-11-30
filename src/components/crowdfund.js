import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

function Crowdfund() {
  // Contract config
  const contractAddress = "0x5D6A7dd379D2b0015CCEE863AB9FeCf8911713C1";
  
  const abi = [
    // Your existing ABI - kept exactly as provided
    {
      inputs: [],
      name: "endFunding",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "setFund",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "_endTime", type: "uint256" }, { internalType: "uint256", name: "_goalAmount", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
      name: "withdrawalSomeFunds",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "withdrawlAll",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "checkAllFunds",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "myAddress", type: "address" }],
      name: "checkYourFunds",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "endTime",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "goalAmount",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "isStarted",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
  ];

  // State
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [goalAmount, setGoalAmount] = useState(0);
  const [totalFundingAmount, setTotalFundingAmount] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [yourBalance, setYourBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [checkAddress, setCheckAddress] = useState("");

  // Helpers
  const shortenAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
  const formatEther = (wei) => ethers.formatEther(wei);
  const parseEther = (eth) => ethers.parseEther(eth);

  // Connect wallet
  const connectWallet = async () => {
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const prov = new ethers.BrowserProvider(window.ethereum);
      const signr = await prov.getSigner(accounts[0]);
      const cont = new ethers.Contract(contractAddress, abi, signr);
      
      setAccount(accounts[0]);
      setProvider(prov);
      setSigner(signr);
      setContract(cont);
      await fetchContractState(cont);
      setStatus("Wallet connected successfully!");
    } catch (error) {
      setStatus("Failed to connect wallet. Install MetaMask?");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch contract state
  const fetchContractState = async (cont) => {
    try {
      const [goal, total, end, started] = await Promise.all([
        cont.goalAmount(),
        cont.checkAllFunds(),
        cont.endTime(),
        cont.isStarted()
      ]);
      setGoalAmount(goal);
      setTotalFundingAmount(total);
      setEndTime(Number(end));
      setIsStarted(started);
      
      // Check your balance
      const yourFunds = await cont.checkYourFunds(account);
      setYourBalance(yourFunds);
      
      // Check if owner (compare with deployer pattern)
      setIsOwner(account.toLowerCase() === (await cont.runner).toLowerCase());
    } catch (error) {
      console.error("Failed to fetch contract state:", error);
    }
  };

  // Fund contract
  const handleSetFund = async () => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      setStatus("Enter valid amount > 0");
      return;
    }
    if (!isStarted) {
      setStatus("Funding is not active");
      return;
    }
    
    try {
      setLoading(true);
      const txn = await contract.setFund({ value: parseEther(fundAmount) });
      setStatus("Transaction pending...");
      await txn.wait();
      setStatus(`Funded ${fundAmount} ETH successfully!`);
      setFundAmount("");
      await fetchContractState(contract);
    } catch (error) {
      const msg = error.reason || error.message || "Funding failed";
      setStatus(msg.includes("not allowed") ? "Only owner can fund" : 
               msg.includes("goal") ? "Goal reached" : 
               msg.includes("stopped") ? "Funding ended" : msg);
    } finally {
      setLoading(false);
    }
  };

  // Owner actions
  const handleEndFunding = async () => {
    if (!window.confirm("End funding? This is irreversible.")) return;
    try {
      setLoading(true);
      const txn = await contract.endFunding();
      await txn.wait();
      setStatus("Funding ended successfully");
      await fetchContractState(contract);
    } catch (error) {
      setStatus("Failed to end funding");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSome = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setStatus("Enter valid withdrawal amount");
      return;
    }
    if (!window.confirm(`Withdraw ${withdrawAmount} ETH?`)) return;
    
    try {
      setLoading(true);
      const txn = await contract.withdrawalSomeFunds(parseEther(withdrawAmount));
      await txn.wait();
      setStatus(`Withdrew ${withdrawAmount} ETH`);
      setWithdrawAmount("");
      await fetchContractState(contract);
    } catch (error) {
      setStatus("Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawAll = async () => {
    if (!window.confirm("Withdraw ALL funds?")) return;
    try {
      setLoading(true);
      const txn = await contract.withdrawlAll();
      await txn.wait();
      setStatus("Withdrew all funds");
      await fetchContractState(contract);
    } catch (error) {
      setStatus("Withdraw all failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAddress = async () => {
    if (!checkAddress) return;
    try {
      const balance = await contract.checkYourFunds(checkAddress);
      setYourBalance(balance);
      setStatus(`Address ${shortenAddress(checkAddress)}: ${formatEther(balance)} ETH`);
    } catch (error) {
      setStatus("Invalid address");
    }
  };

  // Effects
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
        } else {
          setAccount(accounts[0]);
        }
      });
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  useEffect(() => {
    if (contract && account) {
      fetchContractState(contract);
    }
  }, [contract, account]);

  const progress = goalAmount > 0 ? (Number(totalFundingAmount) / Number(goalAmount)) * 100 : 0;
  const timeLeft = endTime > Date.now() / 1000 ? Math.floor((endTime - Date.now() / 1000)) : 0;

  return (
    <div className="min-vh-100 bg-light">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand fw-bold">🚀 CrowdFund</span>
          <div className="navbar-nav ms-auto">
            {!account ? (
              <button className="btn btn-outline-light" onClick={connectWallet} disabled={loading}>
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <span className="navbar-text text-white">
                {shortenAddress(account)} {isOwner && "👑"}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Status */}
      {status && (
        <div className={`alert alert-${status.includes("success") || status.includes("Funded") ? "success" : "danger"} alert-dismissible fade show mx-3 mt-3`} role="alert">
          {status}
          <button type="button" className="btn-close" onClick={() => setStatus("")}></button>
        </div>
      )}

      {/* Main Dashboard */}
      <div className="container my-5">
        <div className="row g-4 justify-content-center">
          
          {/* Left: Funding */}
          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h4 className="card-title text-primary mb-4">💰 Funding</h4>
                
                {/* Progress */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Progress: {progress.toFixed(1)}%</span>
                    <span>{formatEther(totalFundingAmount)} / {formatEther(goalAmount)} ETH</span>
                  </div>
                  <div className="progress" style={{height: "20px"}}>
                    <div 
                      className={`progress-bar ${progress < 80 ? "bg-success" : progress < 100 ? "bg-warning" : "bg-danger"}`}
                      style={{width: `${Math.min(progress, 100)}%`}}
                    />
                  </div>
                </div>

                {/* Campaign Status */}
                <div className="mb-4">
                  <div className="row">
                    <div className="col-6">
                      <strong>Status:</strong> <span className={`badge ${isStarted ? "bg-success" : "bg-secondary"}`}>{isStarted ? "Active" : "Stopped"}</span>
                    </div>
                    <div className="col-6">
                      <strong>Time Left:</strong> {timeLeft > 0 ? `${Math.floor(timeLeft/3600)}h ${Math.floor((timeLeft%3600)/60)}m` : "Ended"}
                    </div>
                  </div>
                </div>

                {/* Fund Form */}
                <div className="input-group mb-3">
                  <span className="input-group-text">ETH</span>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0.1"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    disabled={!isStarted || loading || account === null}
                  />
                  <button 
                    className="btn btn-success" 
                    onClick={handleSetFund}
                    disabled={!isStarted || loading || !fundAmount || account === null}
                  >
                    {loading ? "Funding..." : "Fund Now"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h4 className="card-title text-primary mb-4">{isOwner ? "👑 Owner Controls" : "📊 Stats"}</h4>
                
                {/* Your Balance */}
                <div className="mb-4 p-3 bg-light rounded">
                  <strong>Your Contribution:</strong> {formatEther(yourBalance)} ETH
                </div>

                {/* Check Other Address */}
                <div className="input-group mb-4">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="0x1234..."
                    value={checkAddress}
                    onChange={(e) => setCheckAddress(e.target.value)}
                  />
                  <button className="btn btn-outline-secondary" onClick={handleCheckAddress}>
                    Check
                  </button>
                </div>

                {/* Owner Controls */}
                {isOwner && (
                  <div className="list-group list-group-flush">
                    <button className="list-group-item list-group-item-action d-flex justify-content-between align-items-center btn-outline-danger p-3 mb-2" onClick={handleEndFunding} disabled={loading}>
                      End Funding
                      {loading && <span className="spinner-border spinner-border-sm ms-2"></span>}
                    </button>
                    
                    <div className="input-group mb-3">
                      <span className="input-group-text">ETH</span>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="0.5"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                      />
                      <button className="btn btn-warning" onClick={handleWithdrawSome} disabled={loading || !withdrawAmount}>
                        Withdraw Some
                      </button>
                    </div>
                    
                    <button className="btn btn-danger w-100" onClick={handleWithdrawAll} disabled={loading}>
                      Withdraw All ({formatEther(totalFundingAmount)} ETH)
                      {loading && <span className="spinner-border spinner-border-sm ms-2"></span>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="text-center mt-5">
          <img src="./fund.jpg" className="rounded img-fluid shadow" style={{maxWidth: '600px', maxHeight: '300px', objectFit: 'cover'}} alt="Crowdfunding" />
        </div>
      </div>
    </div>
  );
}

export default Crowdfund;
