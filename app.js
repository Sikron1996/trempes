// TRIPUNK token mint site
// 1) Deploy your ERC-20 mint contract
// 2) Paste the contract address below
// 3) Upload this folder to Vercel / Netlify / GitHub Pages

const CONTRACT_ADDRESS = "0xa90C81909ed1F5f5037d1a3c3EB02017a83EFA3E";
const PRICE_PER_TOKEN_ETH = "0.00005";
const MAX_SUPPLY = 100000;
const MAX_PER_WALLET = 1000;

const ABI = [
  "function mint(uint256 amount) payable",
  "function totalSupply() view returns (uint256)",
  "function mintedAmount(address) view returns (uint256)",
  "function paused() view returns (bool)"
];

let provider;
let signer;
let contract;
let currentAccount = null;

const els = {
  connectTop: document.getElementById("connectTop"),
  connectBtn: document.getElementById("connectBtn"),
  mintBtn: document.getElementById("mintBtn"),
  amount: document.getElementById("amount"),
  minus: document.getElementById("minus"),
  plus: document.getElementById("plus"),
  totalText: document.getElementById("totalText"),
  walletText: document.getElementById("walletText"),
  statusText: document.getElementById("statusText"),
  mintedText: document.getElementById("mintedText"),
  remainingText: document.getElementById("remainingText"),
  progressFill: document.getElementById("progressFill")
};

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "not connected";
}

function clampAmount(value) {
  const n = Math.floor(Number(value || 1));
  return Math.max(1, Math.min(MAX_PER_WALLET, n));
}

function updateTotal() {
  const amount = clampAmount(els.amount.value);
  els.amount.value = amount;
  const total = Number(PRICE_PER_TOKEN_ETH) * amount;
  els.totalText.textContent = `${total.toFixed(5)} ETH`;
}

function setStatus(text) {
  els.statusText.textContent = text;
}

function isContractReady() {
  return CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "PASTE_CONTRACT_ADDRESS_HERE";
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("Open this site in MetaMask, Rabby, OKX wallet browser, or install a browser wallet.");
    return;
  }

  if (!isContractReady()) {
    setStatus("Contract address is not set yet. Paste it in app.js after deploy.");
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  currentAccount = await signer.getAddress();

  if (isContractReady()) {
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    await refreshSupply();
  }

  els.walletText.textContent = `connected: ${shortAddress(currentAccount)}`;
  els.connectTop.textContent = shortAddress(currentAccount);
  els.connectBtn.textContent = "Wallet Connected";
}

async function refreshSupply() {
  if (!isContractReady() || !provider) return;

  try {
    const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const totalSupply = await readContract.totalSupply();
    const minted = Number(ethers.utils.formatUnits(totalSupply, 18));
    const remaining = Math.max(0, MAX_SUPPLY - minted);
    const percent = Math.min(100, (minted / MAX_SUPPLY) * 100);

    els.mintedText.textContent = `${minted.toLocaleString()} / ${MAX_SUPPLY.toLocaleString()}`;
    els.remainingText.textContent = remaining.toLocaleString();
    els.progressFill.style.width = `${percent}%`;
  } catch (err) {
    console.error(err);
    setStatus("Could not read supply. Check contract address and network.");
  }
}

async function mintToken() {
  if (!currentAccount) {
    await connectWallet();
  }

  if (!isContractReady()) {
    alert("Paste contract address in app.js first.");
    return;
  }

  if (!contract) {
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  }

  const amount = clampAmount(els.amount.value);
  const value = ethers.utils.parseEther((Number(PRICE_PER_TOKEN_ETH) * amount).toFixed(18));

  try {
    setStatus("Confirm transaction in your wallet...");
    const tx = await contract.mint(amount, { value });
    setStatus("Transaction sent. Waiting for confirmation...");
    await tx.wait();
    setStatus("Mint successful. Welcome to TRIPUNK.");
    await refreshSupply();
  } catch (err) {
    console.error(err);
    const reason = err?.data?.message || err?.error?.message || err?.message || "Mint failed";
    setStatus(reason.replace("execution reverted: ", ""));
  }
}

els.connectTop.addEventListener("click", connectWallet);
els.connectBtn.addEventListener("click", connectWallet);
els.mintBtn.addEventListener("click", mintToken);
els.amount.addEventListener("input", updateTotal);
els.minus.addEventListener("click", () => { els.amount.value = clampAmount(els.amount.value) - 1; updateTotal(); });
els.plus.addEventListener("click", () => { els.amount.value = clampAmount(els.amount.value) + 1; updateTotal(); });

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}

updateTotal();
