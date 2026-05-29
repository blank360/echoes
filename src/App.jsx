import { useState } from "react";
import Upload from "./components/Upload";
import Verify from "./components/Verify";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("home"); // home | upload | verify
  const [receipt, setReceipt] = useState(null);

  return (
    <div className="app">
      <nav className="nav">
        <div className="logo" onClick={() => { setPage("home"); setReceipt(null); }}>
          ECH<span>O</span>ES
        </div>
        <div className="nav-links">
          <button onClick={() => { setPage("upload"); setReceipt(null); }}>Submit Evidence</button>
          <button onClick={() => { setPage("verify"); setReceipt(null); }}>Verify Record</button>
        </div>
      </nav>

      {page === "home" && (
        <div className="hero">
          <div className="hero-tag"> Decentralized Truth Protocol — Live on Sepolia Testnet</div>
          <h1>THEY CAN BURN<br />THE PAPER.<br /><span>THEY CAN'T<br />BURN THE CHAIN.</span></h1>
          <p className="hero-sub">
            A blockchain-powered truth archive for citizens in war zones, dictatorships,
            and disaster areas. Every testimony. Every video. Every vote.
            <strong> Sealed, distributed, and permanently beyond reach.</strong>
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => setPage("upload")}>Submit Evidence</button>
            <button className="btn-ghost" onClick={() => setPage("verify")}>Verify a Record</button>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-num">3.4B</div>
              <div className="stat-label">People under authoritarian regimes</div>
            </div>
            <div className="stat">
              <div className="stat-num">73%</div>
              <div className="stat-label">Internet shutdowns tied to rights violations</div>
            </div>
            <div className="stat">
              <div className="stat-num">0KB</div>
              <div className="stat-label">Central server. Everything is distributed.</div>
            </div>
          </div>

          <div className="how-it-works">
            <h2>How It Works</h2>
            <div className="steps">
              {[
                { icon: "📡", title: "Capture", desc: "Upload any file — video, photo, document. Works offline via SMS routing." },
                { icon: "🔐", title: "Encrypt", desc: "Your file is encrypted in your browser. Your keys never leave your device." },
                { icon: "🌐", title: "Distribute", desc: "Encrypted file stored across IPFS — a global decentralized network." },
                { icon: "⛓️", title: "Seal", desc: "A cryptographic fingerprint is permanently anchored on the Ethereum blockchain." },
              ].map((s, i) => (
                <div className="step" key={i}>
                  <div className="step-icon">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {page === "upload" && (
        <Upload
          onSuccess={(r) => { setReceipt(r); setPage("receipt"); }}
        />
      )}

      {page === "verify" && <Verify />}

      {page === "receipt" && receipt && (
        <div className="receipt-page">
          <div className="receipt-box">
            <div className="receipt-icon">✅</div>
            <h2>Evidence Sealed</h2>
            <p className="receipt-sub">Your record is now permanently on the blockchain and IPFS. It cannot be altered or deleted.</p>

            <div className="receipt-items">
              <div className="receipt-item">
                <span className="receipt-label">📦 IPFS Hash (File Location)</span>
                <span className="receipt-value">{receipt.ipfsCid}</span>
              </div>
              <div className="receipt-item">
                <span className="receipt-label">🔐 File Fingerprint (SHA-256)</span>
                <span className="receipt-value">{receipt.fileHash}</span>
              </div>
              <div className="receipt-item">
                <span className="receipt-label">⛓️ Blockchain Transaction</span>
                <a
                  className="receipt-link"
                  href={`https://sepolia.etherscan.io/tx/${receipt.txHash}`}
                  target="_blank" rel="noreferrer"
                >
                  View on Etherscan ↗
                </a>
              </div>
              <div className="receipt-item">
                <span className="receipt-label">⏱️ Timestamp</span>
                <span className="receipt-value">{new Date(receipt.timestamp).toUTCString()}</span>
              </div>
            </div>

            <div className="verify-box">
              <p>Share this ID to let anyone verify your record:</p>
              <div className="verify-id">{receipt.ipfsCid}</div>
              <button className="btn-primary" onClick={() => {
                navigator.clipboard.writeText(receipt.ipfsCid);
                alert("Copied to clipboard!");
              }}>Copy Verification ID</button>
            </div>

            <button className="btn-ghost" style={{marginTop:"1rem"}} onClick={() => { setPage("home"); setReceipt(null); }}>
              Back to Home
            </button>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-logo">ECH<span>O</span>ES</div>
        <p>Built for Beyond Tomorrow Summit Hackathon 2026</p>
        <p>Open source · Decentralized · Uncensorable</p>
      </footer>
    </div>
  );
}
