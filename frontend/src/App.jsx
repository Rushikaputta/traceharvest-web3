import { useState, useEffect } from "react";
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { CONTRACT_ADDRESS, EXPECTED_CHAIN_ID, STAGE_LABELS, CHAIN_NAME, RPC_URL } from "./config";
import abi from "./TraceHarvestABI.json";

/* ================================================================
   Initial Seed Data for Interactive Demo / Evaluation Mode
   ================================================================ */
const INITIAL_DEMO_BATCHES = {
  1: {
    id: 1,
    cropName: "Organic Roma Tomatoes",
    farmer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    farmerName: "Ramesh Patil (Nashik Organic Agro)",
    originIpfsHash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
    currentStage: 3,
    exists: true,
    history: [
      {
        stage: 0,
        actor: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        note: "Harvested at peak ripeness. Zero chemical pesticides used.",
        ipfsHash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 2,
      },
      {
        stage: 1,
        actor: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        note: "Loaded into temperature-controlled van (5°C). Transport route: Nashik -> Campus Hub.",
        ipfsHash: "",
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 1.5,
      },
      {
        stage: 2,
        actor: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        note: "Delivered to Campus Central Store. Quality check passed: Brix 5.2, firm texture.",
        ipfsHash: "QmPZ9gcCEpqKTo6aq61g2nXGUhM49wbdukTiJa7T9Zkqoy",
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 0.8,
      },
      {
        stage: 3,
        actor: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        note: "Received at Hostel Dining Mess 2. Stocked for dinner salad prep.",
        ipfsHash: "",
        timestamp: Math.floor(Date.now() / 1000) - 3600 * 4,
      },
    ],
  },
  2: {
    id: 2,
    cropName: "Fresh Alphonso Mangoes",
    farmer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    farmerName: "Devgad Orchards, Ratnagiri",
    originIpfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 1,
    currentStage: 1,
    exists: true,
    history: [
      {
        stage: 0,
        actor: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        note: "GI-tagged Ratnagiri Alphonso. Naturally tree-ripened without carbide.",
        ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 1,
      },
      {
        stage: 1,
        actor: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        note: "Dispatched via expressway courier. Real-time temperature: 12°C.",
        ipfsHash: "",
        timestamp: Math.floor(Date.now() / 1000) - 3600 * 6,
      },
    ],
  },
  3: {
    id: 3,
    cropName: "Himalayan Basmati Rice",
    farmer: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    farmerName: "Doon Valley Farmers Cooperative",
    originIpfsHash: "QmW2WQi7j6c7UgJTarActp7tDNikwh5gPPW73PeTu9xmgE",
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 5,
    currentStage: 2,
    exists: true,
    history: [
      {
        stage: 0,
        actor: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
        note: "Aged 2 years. Verified organic certification #ORG-2026-881.",
        ipfsHash: "QmW2WQi7j6c7UgJTarActp7tDNikwh5gPPW73PeTu9xmgE",
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 5,
      },
      {
        stage: 1,
        actor: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        note: "Freight shipment received at regional railway depot.",
        ipfsHash: "",
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 3,
      },
      {
        stage: 2,
        actor: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        note: "Consignment stored at Campus Bulk Grain Silo. Moisture 11.4%.",
        ipfsHash: "",
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 1,
      },
    ],
  },
};

/* ================================================================
   Hook — wallet connection via MetaMask with fallback
   ================================================================ */
function useWallet() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [readOnlyContract, setReadOnlyContract] = useState(null);
  const [error, setError] = useState("");

  const isRealContractConfigured =
    CONTRACT_ADDRESS &&
    CONTRACT_ADDRESS.startsWith("0x") &&
    CONTRACT_ADDRESS !== "0xPASTE_DEPLOYED_ADDRESS_HERE";

  useEffect(() => {
    if (!isRealContractConfigured) return;
    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const c = new Contract(CONTRACT_ADDRESS, abi, provider);
      setReadOnlyContract(c);
    } catch (_) {
      // Read-only not reachable
    }
  }, [isRealContractConfigured]);

  async function connect() {
    if (!window.ethereum) {
      setError("MetaMask not found. You can still use the interactive Demo Mode below!");
      return;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
        setError(`Please switch MetaMask to ${CHAIN_NAME} (Chain ID: ${EXPECTED_CHAIN_ID}).`);
        return;
      }
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      if (isRealContractConfigured) {
        const c = new Contract(CONTRACT_ADDRESS, abi, signer);
        setContract(c);
      }
      setAccount(addr);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  function disconnect() {
    setAccount(null);
    setContract(null);
  }

  return { account, contract, readOnlyContract, error, connect, disconnect, isRealContractConfigured };
}

/* ================================================================
   Stage helpers
   ================================================================ */
const STAGE_ICONS = ["🌱", "🚚", "🏪", "✅"];
const STAGE_CSS   = ["registered", "intransit", "atvendor", "delivered"];

/* ================================================================
   RegisterBatchForm — Farmer creates a new crop batch
   ================================================================ */
function RegisterBatchForm({ contract, isDemo, onRegisterDemo, onDone }) {
  const [cropName, setCropName] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", type: "" });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);

    if (isDemo || !contract) {
      setTimeout(() => {
        const newId = onRegisterDemo({ cropName, farmerName, ipfsHash });
        setStatus({
          text: `✅ [Demo Mode] Batch #${newId} (${cropName}) registered! Added to simulated blockchain ledger.`,
          type: "success",
        });
        setCropName("");
        setFarmerName("");
        setIpfsHash("");
        setBusy(false);
        onDone?.();
      }, 500);
      return;
    }

    setStatus({ text: "⏳ Sending transaction to blockchain...", type: "info" });
    try {
      const tx = await contract.registerBatch(cropName, farmerName, ipfsHash);
      setStatus({ text: "⛓️ Transaction submitted. Waiting for confirmation...", type: "info" });
      const receipt = await tx.wait();
      setStatus({
        text: `✅ Batch registered on-chain! Tx: ${receipt.hash.slice(0, 10)}...${receipt.hash.slice(-8)}`,
        type: "success",
      });
      setCropName("");
      setFarmerName("");
      setIpfsHash("");
      onDone?.();
    } catch (e) {
      setStatus({ text: `❌ ${e.reason || e.message}`, type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card__header">
        <div className="card__icon">🌾</div>
        <div>
          <div className="card__title">Farmer: Register New Batch</div>
          <div className="card__subtitle">
            {isDemo ? "Create a verifiable crop batch in simulation mode" : "Deploy a new batch directly to the smart contract"}
          </div>
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-group__label">Crop Name</label>
          <input
            className="input"
            placeholder="e.g. Organic Roma Tomatoes"
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            required
            id="input-crop-name"
          />
        </div>
        <div className="form-group">
          <label className="form-group__label">Farmer / Farm Name</label>
          <input
            className="input"
            placeholder="e.g. Ramesh Farms, Nashik"
            value={farmerName}
            onChange={(e) => setFarmerName(e.target.value)}
            required
            id="input-farmer-name"
          />
        </div>
        <div className="form-group">
          <label className="form-group__label">IPFS Certificate Hash (optional)</label>
          <input
            className="input"
            placeholder="e.g. QmXoypiz... (organic certificate or lab report)"
            value={ipfsHash}
            onChange={(e) => setIpfsHash(e.target.value)}
            id="input-ipfs-cert"
          />
        </div>
        <button className="btn btn--primary" disabled={busy} type="submit" id="btn-register-batch">
          {busy ? (
            <>
              <span className="btn__spinner"></span> Submitting...
            </>
          ) : (
            "🌱 Register Batch"
          )}
        </button>
        {status.text && <div className={`status status--${status.type}`}>{status.text}</div>}
      </form>
    </div>
  );
}

/* ================================================================
   UpdateStageForm — Advance batch through supply chain
   ================================================================ */
function UpdateStageForm({ contract, isDemo, onUpdateDemoStage, batches, onDone }) {
  const [batchId, setBatchId] = useState("1");
  const [note, setNote] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [action, setAction] = useState("markInTransit");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", type: "" });

  const actionLabels = {
    markInTransit: {
      label: "🚚 Distributor: Mark In Transit",
      placeholder: "e.g. Picked up from farm, cold chain intact at 4°C",
      targetStage: 1,
    },
    markAtVendor: {
      label: "🏪 Vendor: Mark Arrived at Campus",
      placeholder: "e.g. Received at campus central store, quality inspected",
      targetStage: 2,
    },
    confirmDelivery: {
      label: "✅ Canteen: Confirm Final Delivery",
      placeholder: "e.g. Received at Hostel Mess 2, verified for meal prep",
      targetStage: 3,
    },
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);

    if (isDemo || !contract) {
      setTimeout(() => {
        const res = onUpdateDemoStage(Number(batchId), actionLabels[action].targetStage, note, ipfsHash);
        if (res.success) {
          setStatus({
            text: `✅ [Demo Mode] Batch #${batchId} updated to "${STAGE_LABELS[actionLabels[action].targetStage]}"!`,
            type: "success",
          });
          setNote("");
          setIpfsHash("");
          onDone?.();
        } else {
          setStatus({ text: `❌ ${res.error}`, type: "error" });
        }
        setBusy(false);
      }, 400);
      return;
    }

    setStatus({ text: "⏳ Sending transaction to blockchain...", type: "info" });
    try {
      const tx = await contract[action](batchId, note, ipfsHash);
      setStatus({ text: "⛓️ Transaction submitted. Waiting for confirmation...", type: "info" });
      const receipt = await tx.wait();
      setStatus({
        text: `✅ Stage updated on-chain! Tx: ${receipt.hash.slice(0, 10)}...${receipt.hash.slice(-8)}`,
        type: "success",
      });
      setNote("");
      setIpfsHash("");
      onDone?.();
    } catch (e) {
      setStatus({ text: `❌ ${e.reason || e.message}`, type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card__header">
        <div className="card__icon">📦</div>
        <div>
          <div className="card__title">Update Supply Chain Stage</div>
          <div className="card__subtitle">Distributor / Vendor / Canteen log progress sequentially</div>
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-group__label">Target Stage Action</label>
          <select className="select" value={action} onChange={(e) => setAction(e.target.value)} id="select-action">
            {Object.entries(actionLabels).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-group__label">Batch ID</label>
          <input
            className="input"
            placeholder="e.g. 1"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            required
            id="input-batch-id"
          />
        </div>
        <div className="form-group">
          <label className="form-group__label">Log Note / Checkpoint Details</label>
          <input
            className="input"
            placeholder={actionLabels[action].placeholder}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            id="input-note"
          />
        </div>
        <div className="form-group">
          <label className="form-group__label">IPFS Document / Photo Hash (optional)</label>
          <input
            className="input"
            placeholder="e.g. QmZ9... (shipping bill or inspection report)"
            value={ipfsHash}
            onChange={(e) => setIpfsHash(e.target.value)}
            id="input-ipfs-doc"
          />
        </div>
        <button className="btn btn--primary" disabled={busy} type="submit" id="btn-update-stage">
          {busy ? (
            <>
              <span className="btn__spinner"></span> Submitting...
            </>
          ) : (
            "📤 Update Stage"
          )}
        </button>
        {status.text && <div className={`status status--${status.type}`}>{status.text}</div>}
      </form>
    </div>
  );
}

/* ================================================================
   BatchHistoryView — What students see via QR scan
   ================================================================ */
function BatchHistoryView({ contract, batchId, demoBatches }) {
  const [batch, setBatch] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // If demo batches have this ID, use it immediately
    if (demoBatches && demoBatches[batchId]) {
      setBatch(demoBatches[batchId]);
      setHistory(demoBatches[batchId].history || []);
      setError("");
      setLoading(false);
      return;
    }

    // Otherwise query contract if available
    if (contract) {
      (async () => {
        try {
          const b = await contract.getBatch(batchId);
          const h = await contract.getHistory(batchId);
          setBatch(b);
          setHistory(h);
          setError("");
        } catch (e) {
          setError(`Batch #${batchId} not found on chain.`);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setError(`Batch #${batchId} not found.`);
      setLoading(false);
    }
  }, [contract, batchId, demoBatches]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <div
          className="btn__spinner"
          style={{
            width: 28,
            height: 28,
            borderWidth: 3,
            borderColor: "rgba(74,222,128,0.2)",
            borderTopColor: "#4ade80",
            margin: "0 auto 1rem",
          }}
        ></div>
        <p style={{ color: "var(--color-text-muted)" }}>Reading Batch #{batchId} directly from blockchain...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="status status--error">⚠️ {error}</div>
      </div>
    );
  }

  if (!batch) return null;

  const stageIndex = Number(batch.currentStage);

  return (
    <div className="card" id="batch-history-card">
      <div className="card__header">
        <div className="card__icon">📋</div>
        <div>
          <div className="card__title">
            Batch #{batchId.toString()}: {batch.cropName}
          </div>
          <div className="card__subtitle">Immutable on-chain supply chain provenance</div>
        </div>
      </div>

      {/* Batch info grid */}
      <div className="batch-info">
        <div className="batch-info__item">
          <div className="batch-info__label">Farmer / Producer</div>
          <div className="batch-info__value">{batch.farmerName}</div>
        </div>
        <div className="batch-info__item">
          <div className="batch-info__label">Current Stage</div>
          <div className="batch-info__value">
            <span className={`stage-badge stage-badge--${STAGE_CSS[stageIndex]}`}>
              {STAGE_ICONS[stageIndex]} {STAGE_LABELS[stageIndex]}
            </span>
          </div>
        </div>
        <div className="batch-info__item">
          <div className="batch-info__label">Farmer Wallet Address</div>
          <div className="batch-info__value batch-info__value--mono">
            {typeof batch.farmer === "string" ? `${batch.farmer.slice(0, 10)}...${batch.farmer.slice(-8)}` : "Verified Farmer"}
          </div>
        </div>
        <div className="batch-info__item">
          <div className="batch-info__label">Registered At</div>
          <div className="batch-info__value">
            {new Date(Number(batch.createdAt) * 1000).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {batch.originIpfsHash && (
        <div style={{ marginBottom: "var(--space-md)", padding: "0.5rem 0.75rem", background: "rgba(74,222,128,0.06)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)" }}>
          🌿 <strong>Organic Certificate / Lab Record:</strong>{" "}
          <a href={`https://ipfs.io/ipfs/${batch.originIpfsHash}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            View IPFS Document ({batch.originIpfsHash.slice(0, 12)}...) ↗
          </a>
        </div>
      )}

      {/* Timeline */}
      <div className="divider">Immutable Supply Chain Journey</div>
      <div className="timeline">
        {history.map((h, i) => {
          const si = Number(h.stage);
          const isLast = i === history.length - 1;
          const actorStr = typeof h.actor === "string" ? h.actor : "Verified Node";
          return (
            <div className="timeline__item" key={i}>
              <div className={`timeline__dot ${isLast ? "timeline__dot--active" : ""}`}></div>
              <div className="timeline__stage">
                {STAGE_ICONS[si]} {STAGE_LABELS[si]}
              </div>
              <div className="timeline__meta">
                {new Date(Number(h.timestamp) * 1000).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
              <div className="timeline__actor">
                Signed by: {actorStr.length > 15 ? `${actorStr.slice(0, 6)}...${actorStr.slice(-4)}` : actorStr}
              </div>
              {h.note && <div className="timeline__note">{h.note}</div>}
              {h.ipfsHash && (
                <a className="timeline__link" href={`https://ipfs.io/ipfs/${h.ipfsHash}`} target="_blank" rel="noreferrer">
                  📄 View attached document on IPFS →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   QrForBatch — Generates a scannable QR for a batch
   ================================================================ */
function QrForBatch({ batchId }) {
  const url = `${window.location.origin}${window.location.pathname}?batch=${batchId}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "var(--space-lg)" }}>
      <div className="qr-container">
        <QRCodeSVG value={url} size={190} level="H" includeMargin fgColor="#0a0f0d" bgColor="#ffffff" />
        <div className="qr-container__url">{url}</div>
      </div>
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          textAlign: "center",
          marginTop: "var(--space-sm)",
          maxWidth: 380,
        }}
      >
        📷 Scan with any phone camera or open the link above to view verified food history — <strong>no wallet or login needed!</strong>
      </p>
    </div>
  );
}

/* ================================================================
   LookupAndQr — QR Generator & Batch Browser
   ================================================================ */
function LookupAndQr({ contract, isDemo, demoBatches }) {
  const [batchId, setBatchId] = useState("1");
  const [confirmed, setConfirmed] = useState("1");

  const availableIds = Object.keys(demoBatches || {});

  return (
    <div className="card">
      <div className="card__header">
        <div className="card__icon">📱</div>
        <div>
          <div className="card__title">QR Code Generator & Verification</div>
          <div className="card__subtitle">Generate consumer-facing scannable QR codes for packaging</div>
        </div>
      </div>

      {availableIds.length > 0 && (
        <div style={{ marginBottom: "var(--space-md)" }}>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginBottom: 6 }}>
            QUICK PREVIEW SAMPLE BATCHES:
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {availableIds.map((id) => (
              <button
                key={id}
                className="btn btn--ghost"
                style={{ padding: "0.35rem 0.75rem", fontSize: "var(--font-size-xs)" }}
                onClick={() => {
                  setBatchId(id);
                  setConfirmed(id);
                }}
              >
                #{id}: {demoBatches[id].cropName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        <input
          className="input"
          placeholder="Enter Batch ID (e.g. 1)"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && batchId && setConfirmed(batchId)}
          id="input-qr-batch-id"
        />
        <button
          className="btn btn--primary"
          onClick={() => setConfirmed(batchId)}
          disabled={!batchId}
          id="btn-generate-qr"
          style={{ whiteSpace: "nowrap" }}
        >
          Generate QR
        </button>
      </div>

      {confirmed && <QrForBatch batchId={confirmed} />}
      {confirmed && (
        <BatchHistoryView
          contract={contract}
          batchId={confirmed}
          demoBatches={demoBatches}
        />
      )}
    </div>
  );
}

/* ================================================================
   App — Root component
   ================================================================ */
export default function App() {
  const { account, contract, readOnlyContract, error, connect, disconnect, isRealContractConfigured } = useWallet();
  const [demoBatches, setDemoBatches] = useState(INITIAL_DEMO_BATCHES);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [activeTab, setActiveTab] = useState("qr"); // 'qr', 'register', 'update'
  const [refreshKey, setRefreshKey] = useState(0);

  // If URL has ?batch=ID, display student scan view directly
  const params = new URLSearchParams(window.location.search);
  const scannedBatchId = params.get("batch");

  const viewContract = contract || readOnlyContract;

  // Demo action handlers
  function handleRegisterDemo(newBatchData) {
    const nextId = Math.max(0, ...Object.keys(demoBatches).map(Number)) + 1;
    const newBatch = {
      id: nextId,
      cropName: newBatchData.cropName,
      farmer: account || "0xDemoFarmer70997970C51812dc3A010C7d01b50e0d17dc79C8",
      farmerName: newBatchData.farmerName,
      originIpfsHash: newBatchData.ipfsHash || "",
      createdAt: Math.floor(Date.now() / 1000),
      currentStage: 0,
      exists: true,
      history: [
        {
          stage: 0,
          actor: account || "0xDemoFarmer70997970C51812dc3A010C7d01b50e0d17dc79C8",
          note: "Batch registered on-chain by farmer",
          ipfsHash: newBatchData.ipfsHash || "",
          timestamp: Math.floor(Date.now() / 1000),
        },
      ],
    };
    setDemoBatches((prev) => ({ ...prev, [nextId]: newBatch }));
    return nextId;
  }

  function handleUpdateDemoStage(batchId, targetStage, note, ipfsHash) {
    const b = demoBatches[batchId];
    if (!b) return { success: false, error: "Batch not found" };
    if (targetStage !== b.currentStage + 1) {
      return {
        success: false,
        error: `Invalid transition. Current stage is "${STAGE_LABELS[b.currentStage]}". You must advance to "${STAGE_LABELS[b.currentStage + 1]}".`,
      };
    }

    const newHistoryItem = {
      stage: targetStage,
      actor: account || `0xOperatorNode${Math.floor(Math.random() * 9000 + 1000)}`,
      note: note || `Stage advanced to ${STAGE_LABELS[targetStage]}`,
      ipfsHash: ipfsHash || "",
      timestamp: Math.floor(Date.now() / 1000),
    };

    setDemoBatches((prev) => ({
      ...prev,
      [batchId]: {
        ...b,
        currentStage: targetStage,
        history: [...b.history, newHistoryItem],
      },
    }));

    return { success: true };
  }

  return (
    <div className="app">
      {/* ---------- Header ---------- */}
      <header className="header">
        <div className="header__logo">🌿</div>
        <h1 className="header__title">TraceHarvest</h1>
        <p className="header__subtitle">
          Transparent campus food supply chain — from farm harvest to student plate, secured on-chain.
        </p>

        {/* Mode switcher banner */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1.25rem",
            background: "rgba(22, 33, 27, 0.7)",
            padding: "4px 8px",
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(74,222,128,0.2)",
          }}
        >
          <button
            className={`btn ${isDemoMode ? "btn--primary" : "btn--ghost"}`}
            style={{ padding: "0.35rem 0.9rem", fontSize: "var(--font-size-xs)", borderRadius: "var(--radius-full)" }}
            onClick={() => setIsDemoMode(true)}
          >
            🎮 Interactive Simulator
          </button>
          <button
            className={`btn ${!isDemoMode ? "btn--primary" : "btn--ghost"}`}
            style={{ padding: "0.35rem 0.9rem", fontSize: "var(--font-size-xs)", borderRadius: "var(--radius-full)" }}
            onClick={() => setIsDemoMode(false)}
          >
            ⛓️ Live Web3 / MetaMask
          </button>
        </div>
      </header>

      {/* ---------- Student Scan View (Direct via ?batch=id) ---------- */}
      {scannedBatchId && (
        <>
          <div className="info-banner">
            <span className="info-banner__icon">🔍</span>
            <div>
              <strong>QR Code Verification: Viewing Batch #{scannedBatchId}</strong>
              <br />
              This provenance report is cryptographically sealed on the blockchain. Any consumer can inspect
              every stage, handler address, and timestamp without needing a wallet.
            </div>
          </div>
          <BatchHistoryView
            contract={viewContract}
            batchId={scannedBatchId}
            demoBatches={demoBatches}
          />
          <div style={{ textAlign: "center", marginTop: "var(--space-xl)" }}>
            <a
              href={window.location.pathname}
              className="btn btn--ghost"
              style={{ display: "inline-flex", textDecoration: "none" }}
            >
              ← Back to Main Dashboard
            </a>
          </div>
        </>
      )}

      {/* ---------- Main Dashboard View ---------- */}
      {!scannedBatchId && (
        <>
          {/* Status bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)", flexWrap: "wrap", gap: "var(--space-sm)" }}>
            <div className="connection-badge" style={{ marginBottom: 0 }}>
              <span className="connection-badge__dot"></span>
              <span>Mode:</span>
              <strong style={{ color: "var(--color-primary)" }}>
                {isDemoMode ? "Interactive Simulation" : account ? "MetaMask Connected" : "Awaiting Wallet"}
              </strong>
            </div>

            {!isDemoMode && (
              <div>
                {!account ? (
                  <button className="btn btn--primary" style={{ padding: "0.4rem 1rem", fontSize: "var(--font-size-sm)" }} onClick={connect} id="btn-connect-wallet">
                    🦊 Connect MetaMask
                  </button>
                ) : (
                  <button className="btn btn--ghost" style={{ padding: "0.4rem 1rem", fontSize: "var(--font-size-xs)" }} onClick={disconnect}>
                    {account.slice(0, 6)}...{account.slice(-4)} (Disconnect)
                  </button>
                )}
              </div>
            )}
          </div>

          {error && <div className="status status--error" style={{ marginBottom: "var(--space-lg)" }}>⚠️ {error}</div>}

          {/* Navigation tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-sm)", marginBottom: "var(--space-xl)" }}>
            <button
              className={`btn ${activeTab === "qr" ? "btn--primary" : "btn--ghost"}`}
              style={{ fontSize: "var(--font-size-sm)", padding: "0.6rem" }}
              onClick={() => setActiveTab("qr")}
            >
              📱 QR & Trace
            </button>
            <button
              className={`btn ${activeTab === "register" ? "btn--primary" : "btn--ghost"}`}
              style={{ fontSize: "var(--font-size-sm)", padding: "0.6rem" }}
              onClick={() => setActiveTab("register")}
            >
              🌾 Register Batch
            </button>
            <button
              className={`btn ${activeTab === "update" ? "btn--primary" : "btn--ghost"}`}
              style={{ fontSize: "var(--font-size-sm)", padding: "0.6rem" }}
              onClick={() => setActiveTab("update")}
            >
              🚚 Update Stage
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "qr" && (
            <LookupAndQr
              contract={viewContract}
              isDemo={isDemoMode}
              demoBatches={demoBatches}
            />
          )}

          {activeTab === "register" && (
            <RegisterBatchForm
              contract={contract}
              isDemo={isDemoMode}
              onRegisterDemo={handleRegisterDemo}
              onDone={() => {
                setRefreshKey((k) => k + 1);
                setActiveTab("qr");
              }}
            />
          )}

          {activeTab === "update" && (
            <UpdateStageForm
              contract={contract}
              isDemo={isDemoMode}
              onUpdateDemoStage={handleUpdateDemoStage}
              batches={demoBatches}
              onDone={() => {
                setRefreshKey((k) => k + 1);
                setActiveTab("qr");
              }}
            />
          )}
        </>
      )}

      {/* ---------- Footer ---------- */}
      <footer className="footer">
        <div>TraceHarvest — Farm-to-Campus Supply Chain Traceability</div>
        <div className="footer__chain">
          <span className="footer__chain-dot"></span>
          {CHAIN_NAME} • Ethers.js v6 • Solidity 0.8.20
        </div>
      </footer>
    </div>
  );
}
