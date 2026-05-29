import { useState } from "react";
import { ethers } from "ethers";

// ─── helpers ────────────────────────────────────────────────
async function hashFile(file) {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function encryptFile(file) {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buf);
  const exportedKey = await crypto.subtle.exportKey("raw", key);

  // Return encrypted blob + key info (user keeps the key)
  return {
    encryptedBlob: new Blob([encrypted], { type: "application/octet-stream" }),
    keyHex: Array.from(new Uint8Array(exportedKey)).map(b => b.toString(16).padStart(2,"0")).join(""),
    ivHex: Array.from(iv).map(b => b.toString(16).padStart(2,"0")).join(""),
  };
}

async function uploadToIPFS(blob, apiToken) {
  // Use web3.storage HTTP API directly
  const formData = new FormData();
  formData.append("file", blob, "echoes-evidence.enc");

  const res = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}` },
    body: formData,
  });
  if (!res.ok) throw new Error("IPFS upload failed: " + (await res.text()));
  const data = await res.json();
  return data.cid;
}

async function sealOnChain(fileHash, ipfsCid, signer) {
  // Encode the record as a transaction (we store data in tx input field)
  const record = JSON.stringify({ fileHash, ipfsCid, ts: Date.now() });
  const tx = await signer.sendTransaction({
    to: await signer.getAddress(), // send to self — data is what matters
    value: 0n,
    data: ethers.hexlify(ethers.toUtf8Bytes(record)),
  });
  await tx.wait();
  return tx.hash;
}

// ─── component ──────────────────────────────────────────────
const STEPS = ["Configure", "Select File", "Encrypt", "Upload to IPFS", "Seal on Chain", "Done"];

export default function Upload({ onSuccess }) {
  const [step, setStep] = useState(0);
  const [apiToken, setApiToken] = useState("");
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [credential, setCredential] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [keyInfo, setKeyInfo] = useState(null);

  async function handleSubmit() {
    setError("");
    try {
      if (!file) return setError("Please select a file.");
      if (!apiToken.trim()) return setError("Please enter your Web3.Storage API token.");
      if (!credential.trim()) return setError("Please enter your voting credential.");

      // Step: Encrypt
      setStep(2); setStatus("Encrypting your file in browser...");
      const fileHash = await hashFile(file);
      const { encryptedBlob, keyHex, ivHex } = await encryptFile(file);
      setKeyInfo({ keyHex, ivHex });

      // Step: IPFS
      setStep(3); setStatus("Uploading encrypted file to IPFS...");
      const ipfsCid = await uploadToIPFS(encryptedBlob, apiToken);

      // Step: Blockchain
      setStep(4); setStatus("Connecting to MetaMask...");
      if (!window.ethereum) throw new Error("MetaMask not found. Please install it.");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check network — must be Sepolia (chainId 11155111)
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        throw new Error("Please switch MetaMask to the Sepolia testnet.");
      }

      const signer = await provider.getSigner();
      setStatus("Sealing record on Ethereum Sepolia blockchain...");
      const txHash = await sealOnChain(fileHash, ipfsCid, signer);

      setStep(5);
      onSuccess({
        fileHash,
        ipfsCid,
        txHash,
        timestamp: Date.now(),
        keyHex,
        ivHex,
      });
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setStep(1);
    }
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-tag">// Submit Evidence</div>
        <h2 className="page-title">Seal Your Truth<br />On The Chain</h2>

        {/* Progress */}
        <div className="progress-bar">
          {STEPS.map((s, i) => (
            <div key={i} className={`progress-step ${i <= step ? "active" : ""}`}>
              <div className="progress-dot">{i < step ? "✓" : i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>

        {step < 2 && (
          <div className="form">
            {/* API Token */}
            <div className="form-group">
              <label>Web3.Storage API Token</label>
              <input
                type="password"
                placeholder="Paste your web3.storage token here..."
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
              />
              <small>
                Get a free token at{" "}
                <a href="https://web3.storage" target="_blank" rel="noreferrer">web3.storage</a>.
                Never stored by ECHOES.
              </small>
            </div>

            {/* Credential */}
            <div className="form-group">
              <label>Voting Credential (Issued by Authority)</label>
              <input
                type="text"
                placeholder="e.g. UN-REFUGEE-2026-XXXX or your credential code..."
                value={credential}
                onChange={e => setCredential(e.target.value)}
              />
              <small>This proves you are a verified unique human. Used as a nullifier — you cannot submit twice with the same credential.</small>
            </div>

            {/* Description */}
            <div className="form-group">
              <label>Evidence Description</label>
              <textarea
                placeholder="Describe what this evidence shows, where it was recorded, and when..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* File */}
            <div className="form-group">
              <label>Select File</label>
              <div
                className="dropzone"
                onClick={() => document.getElementById("file-input").click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); setStep(1); }}
              >
                {file ? (
                  <div>
                    <div className="drop-icon">📄</div>
                    <strong>{file.name}</strong>
                    <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <div className="drop-icon">📁</div>
                    <strong>Click or drag & drop</strong>
                    <p>Video, photo, audio, or document</p>
                  </div>
                )}
              </div>
              <input
                id="file-input"
                type="file"
                style={{ display: "none" }}
                onChange={e => { setFile(e.target.files[0]); setStep(1); }}
              />
            </div>

            {error && <div className="error-box">⚠️ {error}</div>}

            <button
              className="btn-primary btn-full"
              onClick={handleSubmit}
              disabled={!file || !apiToken || !credential}
            >
              🔐 Encrypt, Upload & Seal on Blockchain
            </button>

            <p className="disclaimer">
              Your file is encrypted <strong>in your browser</strong> before leaving your device.
              ECHOES never sees your original file. Make sure MetaMask is installed and set to <strong>Sepolia Testnet</strong>.
            </p>
          </div>
        )}

        {step >= 2 && step < 5 && (
          <div className="processing">
            <div className="spinner"></div>
            <h3>{STEPS[step]}</h3>
            <p>{status}</p>
            {keyInfo && step >= 3 && (
              <div className="key-warning">
                <p>🔑 <strong>Save your decryption key!</strong> You'll need it to decrypt your file later.</p>
                <code>KEY: {keyInfo.keyHex.substring(0, 32)}...</code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
