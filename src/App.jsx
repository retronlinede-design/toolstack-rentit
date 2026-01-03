// RentIt (ToolStack) — module-ready MVP (Check-It design master UI)
// Paste into: src/App.jsx
// Requires: Tailwind v4 configured (same as other ToolStack apps).
//
// Features (single-file MVP):
// - Unit & landlord profile
// - Defects tracker
// - Incidents timeline
// - Evidence index
// - Correspondence log
// - Rent ledger (cold/warm + payments + notes)
// - Preview modal (prints ONLY preview sheet)
// - Export / Import JSON
// - Standard Help Pack v1.0 modal + pinned "?" icon
//
// Storage:
// - App data: toolstack.rentit.v1
// - Shared profile: toolstack.profile.v1

import React, { useEffect, useMemo, useRef, useState } from "react";

const APP_ID = "rentit";
const APP_VERSION = "v1";
const KEY = `toolstack.${APP_ID}.${APP_VERSION}`;
const PROFILE_KEY = "toolstack.profile.v1";

// Put your real ToolStack hub URL here (Wix page)
const HUB_URL = "https://YOUR-WIX-HUB-URL-HERE";

const uid = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
};

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function toNum(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function EUR(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  return x.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

function defaultState() {
  return {
    meta: {
      appId: APP_ID,
      version: APP_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Unit / contract basics
    unit: {
      label: "My rental",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postalCode: "",
      country: "DE",
      tenancyStart: "",
      leaseType: "",
      notes: "",
    },

    landlord: {
      name: "",
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      notes: "",
    },

    rent: {
      currency: "EUR",
      coldRent: 0,
      warmRent: 0,
      extrasNote: "Warm rent may include heating/water/electricity depending on contract.",
    },

    defects: [],
    incidents: [],
    evidence: [],
    correspondence: [],
    ledger: [],

    // UI prefs
    ui: {
      tab: "overview", // overview | unit | defects | incidents | evidence | letters | rent
    },
  };
}

// Load with migration support for older keys (if any)
function loadState() {
  const direct = safeParse(localStorage.getItem(KEY), null);
  if (direct) return direct;

  // common legacy keys fallback (safe if not present)
  const legacyKeys = ["toolstack_rentit_v1", "toolstack.rentit.v1", "toolstack_mietakte_v1"];
  for (const k of legacyKeys) {
    const v = safeParse(localStorage.getItem(k), null);
    if (v) return { ...defaultState(), ...v, meta: { ...defaultState().meta, ...(v.meta || {}) } };
  }

  return defaultState();
}

function saveState(state) {
  const next = {
    ...state,
    meta: { ...(state.meta || {}), appId: APP_ID, version: APP_VERSION, updatedAt: new Date().toISOString() },
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

// ===== Styling: Check-It Master =====
const inputBase =
  "w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/25 focus:border-neutral-300";

const textareaBase =
  "w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/25 focus:border-neutral-300 min-h-[92px]";

const ACTION_BASE =
  "print:hidden h-10 w-full rounded-xl text-sm font-medium border transition shadow-sm active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";

function ActionButton({ children, onClick, tone = "default", disabled, title }) {
  const cls =
    tone === "primary"
      ? "bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-700"
      : tone === "danger"
        ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
        : "bg-white hover:bg-neutral-50 text-neutral-900 border-neutral-200";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${ACTION_BASE} ${cls}`}
    >
      {children}
    </button>
  );
}

function ActionFileButton({ children, onFile, accept = "application/json", tone = "primary", title }) {
  const cls =
    tone === "primary"
      ? "bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-700"
      : "bg-white hover:bg-neutral-50 text-neutral-900 border-neutral-200";

  return (
    <label title={title} className={`${ACTION_BASE} ${cls} cursor-pointer`}>
      <span>{children}</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile?.(e.target.files?.[0] || null)}
      />
    </label>
  );
}

function HelpIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9.6 9.2a2.4 2.4 0 1 1 4.2 1.6c-.6.6-1.2.9-1.5 1.4-.3.4-.3.8-.3 1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function HelpModal({ open, onClose, storageKey, profileKey }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 print:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-neutral-200 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-neutral-900">Help</div>
              <div className="text-sm text-neutral-600 mt-1">Autosave, backups, and continuity (Help Pack v1.0)</div>
            </div>
            <button
              type="button"
              className="h-10 w-10 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900 flex items-center justify-center"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 h-[2px] w-56 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />
        </div>

        <div className="p-4 space-y-4 text-sm text-neutral-800">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="font-semibold text-neutral-900">How saving works</div>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>This app autosaves on this device in your browser (localStorage).</li>
              <li>If you clear browser data, use a different browser/device, or use private/incognito mode, data may not be there.</li>
              <li>Use <span className="font-medium">Export</span> to create a backup file you control.</li>
              <li>Use <span className="font-medium">Import</span> to restore a backup (it replaces the current app data).</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="font-semibold text-neutral-900">Recommended routine</div>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Export after important updates (new defects, incidents, payments, evidence references, or major edits).</li>
              <li>
                Keep backups in a folder like:{" "}
                <span className="font-mono text-xs">ToolStack/Backups/&lt;AppName&gt;</span>.
              </li>
              <li>Use <span className="font-medium">Preview → Print / Save PDF</span> when you need a clean report for sharing.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="font-semibold text-neutral-900">Export / Import rules</div>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Export creates a JSON backup file you can store anywhere (Drive, email to yourself, USB).</li>
              <li>Import restores from that JSON backup and overwrites current app data.</li>
              <li>Before importing, export your current state first (so you can roll back if needed).</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="font-semibold text-neutral-900">Printing / PDF</div>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Use <span className="font-medium">Preview</span> to check the report.</li>
              <li>Use <span className="font-medium">Print / Save PDF</span> to generate a PDF from the preview report.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="font-semibold text-neutral-900">Troubleshooting</div>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>If data “disappeared”, you are likely in a different browser/device/profile or you cleared site data.</li>
              <li>Import your latest backup JSON to restore instantly.</li>
              <li>Avoid private/incognito mode for long-term records.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="font-semibold text-neutral-900">Storage keys</div>
            <div className="mt-2 space-y-1">
              <div className="text-neutral-700">App data: <span className="font-mono text-xs">{storageKey}</span></div>
              <div className="text-neutral-700">Shared profile: <span className="font-mono text-xs">{profileKey}</span></div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              className="px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900 transition"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Small helpers =====
function downloadJson(filename, dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file"));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsText(file);
  });
}

function pill(status) {
  const s = String(status || "").toLowerCase();
  if (s === "open") return "bg-red-50 text-red-700 border-red-200";
  if (s === "in progress" || s === "in-progress") return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "resolved" || s === "closed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-neutral-50 text-neutral-700 border-neutral-200";
}

// ===== App =====
export default function App() {
  const [state, setState] = useState(loadState());

  const [helpOpen, setHelpOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Debounced autosave to reduce churn
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setState((prev) => saveState(prev));
    }, 150);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(state)]);

  function update(patch) {
    setState((prev) => saveState({ ...prev, ...patch }));
  }

  function setTab(tab) {
    setState((prev) => saveState({ ...prev, ui: { ...(prev.ui || {}), tab } }));
  }

  function exportJSON() {
    const payload = { exportedAt: new Date().toISOString(), data: state };
    downloadJson(`toolstack-rentit-${APP_VERSION}-${isoToday()}.json`, payload);
  }

  async function importJSON(file) {
    try {
      const txt = await readFileAsText(file);
      const parsed = JSON.parse(txt);
      const incoming = parsed?.data || parsed; // allow either wrapped or raw
      if (!incoming) throw new Error("Invalid file");
      const merged = {
        ...defaultState(),
        ...incoming,
        meta: { ...defaultState().meta, ...(incoming.meta || {}), appId: APP_ID, version: APP_VERSION },
      };
      setState(saveState(merged));
    } catch (e) {
      alert("Import failed: " + (e?.message || "unknown error"));
    }
  }

  function openPreview() {
    setPreviewOpen(true);
  }

  function printPreview() {
    setPreviewOpen(true);
    setTimeout(() => window.print(), 80);
  }

  // ===== Derived totals =====
  const defectsOpen = useMemo(
    () => (state.defects || []).filter((d) => String(d.status || "open").toLowerCase() !== "resolved").length,
    [state.defects]
  );

  const rentSummary = useMemo(() => {
    const ledger = state.ledger || [];
    const byMonth = new Map();
    for (const row of ledger) {
      const m = String(row.month || "").slice(0, 7);
      if (!m) continue;
      const cur = byMonth.get(m) || { month: m, due: 0, paid: 0 };
      cur.due += toNum(row.due, 0);
      cur.paid += toNum(row.paid, 0);
      byMonth.set(m, cur);
    }
    const months = Array.from(byMonth.values()).sort((a, b) => (a.month < b.month ? 1 : -1));
    const totalDue = months.reduce((s, x) => s + x.due, 0);
    const totalPaid = months.reduce((s, x) => s + x.paid, 0);
    return { months, totalDue, totalPaid, balance: totalPaid - totalDue };
  }, [state.ledger]);

  const tab = state.ui?.tab || "overview";

  // ===== Add helpers =====
  function addDefect() {
    const d = {
      id: uid(),
      createdAt: new Date().toISOString(),
      title: "New defect",
      location: "",
      firstNoted: isoToday(),
      status: "Open", // Open | In Progress | Resolved
      severity: "Medium", // Low | Medium | High
      description: "",
      desiredFix: "",
      lastUpdate: "",
    };
    update({ defects: [d, ...(state.defects || [])] });
    setTab("defects");
  }

  function addIncident() {
    const it = {
      id: uid(),
      createdAt: new Date().toISOString(),
      date: isoToday(),
      time: "",
      title: "New incident",
      category: "General",
      description: "",
      relatedDefectId: "",
      evidenceRefs: "",
    };
    update({ incidents: [it, ...(state.incidents || [])] });
    setTab("incidents");
  }

  function addEvidence() {
    const ev = {
      id: uid(),
      createdAt: new Date().toISOString(),
      date: isoToday(),
      type: "Photo",
      label: "New evidence",
      storage: "Local",
      reference: "",
      notes: "",
    };
    update({ evidence: [ev, ...(state.evidence || [])] });
    setTab("evidence");
  }

  function addLetter() {
    const c = {
      id: uid(),
      createdAt: new Date().toISOString(),
      date: isoToday(),
      channel: "Email", // Email | Post | WhatsApp | Phone | In person
      to: "",
      subject: "",
      summary: "",
      status: "Sent", // Draft | Sent | Received | Follow-up
      reference: "",
    };
    update({ correspondence: [c, ...(state.correspondence || [])] });
    setTab("letters");
  }

  function addLedgerRow() {
    const r = {
      id: uid(),
      createdAt: new Date().toISOString(),
      month: isoToday().slice(0, 7), // YYYY-MM
      due: toNum(state.rent?.warmRent, 0),
      paid: 0,
      datePaid: "",
      method: "Transfer",
      note: "",
    };
    update({ ledger: [r, ...(state.ledger || [])] });
    setTab("rent");
  }

  // ===== Render =====
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Print rules */}
      <style>{`
        @media print { .print\\:hidden { display: none !important; } }
      `}</style>

      {/* When preview is open, print ONLY the preview sheet */}
      {previewOpen ? (
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #rentit-print, #rentit-print * { visibility: visible !important; }
            #rentit-print { position: absolute !important; left: 0; top: 0; width: 100%; }
          }
        `}</style>
      ) : null}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} storageKey={KEY} profileKey={PROFILE_KEY} />

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight">RentIt</div>
            <div className="text-sm text-neutral-600">
              Module-ready ({APP_ID}.{APP_VERSION}) • Rental case file manager
            </div>
            <div className="mt-3 h-[2px] w-80 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />
          </div>

          {/* Normalized Top Actions grid + pinned help icon */}
          <div className="w-full sm:w-[760px]">
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ActionButton onClick={openPreview}>Preview</ActionButton>
                <ActionButton onClick={printPreview}>Print / Save PDF</ActionButton>
                <ActionButton onClick={exportJSON}>Export</ActionButton>
                <ActionFileButton onFile={(f) => importJSON(f)} tone="primary">
                  Import
                </ActionFileButton>
              </div>

              {/* Help icon pinned far-right */}
              <button
                type="button"
                className="print:hidden h-10 w-10 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900 flex items-center justify-center shadow-sm active:translate-y-[1px] transition"
                onClick={() => setHelpOpen(true)}
                title="Help"
                aria-label="Help"
              >
                <HelpIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 bg-white border border-neutral-200 rounded-2xl shadow-sm p-2 print:hidden">
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {[
              ["overview", "Overview"],
              ["unit", "Unit"],
              ["defects", "Defects"],
              ["incidents", "Incidents"],
              ["evidence", "Evidence"],
              ["letters", "Letters"],
              ["rent", "Rent"],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`h-10 rounded-xl text-sm font-medium border shadow-sm active:translate-y-[1px] transition ${
                  tab === k
                    ? "bg-neutral-700 text-white border-neutral-700"
                    : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview modal */}
        {previewOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-3 z-50 print:hidden">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <div className="font-semibold">Preview — RentIt case report</div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm transition"
                    onClick={printPreview}
                  >
                    Print / Save PDF
                  </button>
                  <button
                    className="px-3 py-2 rounded-xl text-sm font-medium border border-neutral-700 bg-neutral-700 text-white hover:bg-neutral-600 shadow-sm transition"
                    onClick={() => setPreviewOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-auto max-h-[80vh]">
                <div id="rentit-print">
                  <div className="text-xl font-bold">ToolStack</div>
                  <div className="text-sm text-neutral-600">RentIt — case report</div>
                  <div className="mt-2 h-[2px] w-72 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />
                  <div className="mt-3 text-sm">
                    <div>
                      <span className="text-neutral-600">Generated:</span> {new Date().toLocaleString()}
                    </div>
                    <div>
                      <span className="text-neutral-600">Unit label:</span> {state.unit?.label || "-"}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-neutral-200 p-3 text-sm">
                      <div className="font-semibold">Unit</div>
                      <div className="mt-2 text-neutral-700">
                        <div>{state.unit?.addressLine1 || "-"}</div>
                        <div>{state.unit?.addressLine2 || ""}</div>
                        <div>
                          {(state.unit?.postalCode || "").trim()} {(state.unit?.city || "").trim()}
                        </div>
                        <div className="mt-2">
                          <span className="text-neutral-600">Tenancy start:</span> {state.unit?.tenancyStart || "-"}
                        </div>
                        <div>
                          <span className="text-neutral-600">Lease type:</span> {state.unit?.leaseType || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 p-3 text-sm">
                      <div className="font-semibold">Landlord</div>
                      <div className="mt-2 text-neutral-700">
                        <div>{state.landlord?.name || "-"}</div>
                        <div>{state.landlord?.email || ""}</div>
                        <div>{state.landlord?.phone || ""}</div>
                        <div className="mt-2">{state.landlord?.addressLine1 || "-"}</div>
                        <div>{state.landlord?.addressLine2 || ""}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-neutral-200 p-3 text-sm">
                    <div className="font-semibold">Snapshot</div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                        <div className="text-xs text-neutral-600">Open defects</div>
                        <div className="text-xl font-bold">{defectsOpen}</div>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                        <div className="text-xs text-neutral-600">Incidents</div>
                        <div className="text-xl font-bold">{(state.incidents || []).length}</div>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                        <div className="text-xs text-neutral-600">Evidence items</div>
                        <div className="text-xl font-bold">{(state.evidence || []).length}</div>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                        <div className="text-xs text-neutral-600">Letters / comms</div>
                        <div className="text-xl font-bold">{(state.correspondence || []).length}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-neutral-200 p-3 text-sm">
                    <div className="font-semibold">Rent summary</div>
                    <div className="mt-2 text-neutral-700">
                      <div>Warm rent (default): <span className="font-semibold">{EUR(state.rent?.warmRent || 0)}</span></div>
                      <div>Cold rent: <span className="font-semibold">{EUR(state.rent?.coldRent || 0)}</span></div>
                      <div className="mt-2">
                        Ledger totals — Due: <span className="font-semibold">{EUR(rentSummary.totalDue)}</span>{" "}
                        • Paid: <span className="font-semibold">{EUR(rentSummary.totalPaid)}</span>{" "}
                        • Balance: <span className="font-semibold">{EUR(rentSummary.balance)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Defects */}
                  <div className="mt-4 rounded-2xl border border-neutral-200 p-3 text-sm">
                    <div className="font-semibold">Defects</div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-neutral-600">
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2 pr-3">Title</th>
                            <th className="py-2 pr-3">Location</th>
                            <th className="py-2 pr-3">First noted</th>
                            <th className="py-2 pr-3">Severity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(state.defects || []).slice(0, 20).map((d) => (
                            <tr key={d.id} className="border-t">
                              <td className="py-2 pr-3">{d.status || "-"}</td>
                              <td className="py-2 pr-3">{d.title || "-"}</td>
                              <td className="py-2 pr-3">{d.location || "-"}</td>
                              <td className="py-2 pr-3">{d.firstNoted || "-"}</td>
                              <td className="py-2 pr-3">{d.severity || "-"}</td>
                            </tr>
                          ))}
                          {(state.defects || []).length === 0 ? (
                            <tr>
                              <td className="py-3 text-neutral-500" colSpan={5}>
                                No defects logged.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                      {(state.defects || []).length > 20 ? (
                        <div className="text-xs text-neutral-500 mt-2">Showing first 20 defects in preview.</div>
                      ) : null}
                    </div>
                  </div>

                  {/* Incidents */}
                  <div className="mt-4 rounded-2xl border border-neutral-200 p-3 text-sm">
                    <div className="font-semibold">Incidents</div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-neutral-600">
                            <th className="py-2 pr-3">Date</th>
                            <th className="py-2 pr-3">Title</th>
                            <th className="py-2 pr-3">Category</th>
                            <th className="py-2 pr-3">Related defect</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(state.incidents || []).slice(0, 20).map((it) => (
                            <tr key={it.id} className="border-t">
                              <td className="py-2 pr-3">{it.date || "-"}</td>
                              <td className="py-2 pr-3">{it.title || "-"}</td>
                              <td className="py-2 pr-3">{it.category || "-"}</td>
                              <td className="py-2 pr-3">{it.relatedDefectId ? "Yes" : "-"}</td>
                            </tr>
                          ))}
                          {(state.incidents || []).length === 0 ? (
                            <tr>
                              <td className="py-3 text-neutral-500" colSpan={4}>
                                No incidents logged.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                      {(state.incidents || []).length > 20 ? (
                        <div className="text-xs text-neutral-500 mt-2">Showing first 20 incidents in preview.</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 text-xs text-neutral-500">
                    Storage key: <span className="font-mono">{KEY}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mt-4 grid grid-cols-1 gap-4">
          {tab === "overview" && (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Quick actions</div>
                  <div className="text-sm text-neutral-600 mt-1">
                    Add the key items first. Export backups after major updates.
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-2">
                <ActionButton onClick={() => setTab("unit")} tone="primary">Edit unit</ActionButton>
                <ActionButton onClick={addDefect}>+ Defect</ActionButton>
                <ActionButton onClick={addIncident}>+ Incident</ActionButton>
                <ActionButton onClick={addEvidence}>+ Evidence</ActionButton>
                <ActionButton onClick={addLetter}>+ Letter</ActionButton>
                <ActionButton onClick={addLedgerRow}>+ Rent row</ActionButton>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-600">Open defects</div>
                  <div className="text-2xl font-bold">{defectsOpen}</div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-600">Incidents</div>
                  <div className="text-2xl font-bold">{(state.incidents || []).length}</div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-600">Evidence</div>
                  <div className="text-2xl font-bold">{(state.evidence || []).length}</div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-600">Ledger balance</div>
                  <div className="text-2xl font-bold">{EUR(rentSummary.balance)}</div>
                </div>
              </div>
            </div>
          )}

          {tab === "unit" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
                <div className="font-semibold">Unit</div>
                <div className="text-sm text-neutral-600 mt-1">Address and tenancy basics.</div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="text-sm">
                    <div className="text-neutral-600">Label</div>
                    <input
                      className={inputBase}
                      value={state.unit?.label || ""}
                      onChange={(e) => update({ unit: { ...(state.unit || {}), label: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm">
                    <div className="text-neutral-600">Tenancy start</div>
                    <input
                      type="date"
                      className={inputBase}
                      value={state.unit?.tenancyStart || ""}
                      onChange={(e) => update({ unit: { ...(state.unit || {}), tenancyStart: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <div className="text-neutral-600">Address line 1</div>
                    <input
                      className={inputBase}
                      value={state.unit?.addressLine1 || ""}
                      onChange={(e) => update({ unit: { ...(state.unit || {}), addressLine1: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <div className="text-neutral-600">Address line 2</div>
                    <input
                      className={inputBase}
                      value={state.unit?.addressLine2 || ""}
                      onChange={(e) => update({ unit: { ...(state.unit || {}), addressLine2: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm">
                    <div className="text-neutral-600">Postal code</div>
                    <input
                      className={inputBase}
                      value={state.unit?.postalCode || ""}
                      onChange={(e) => update({ unit: { ...(state.unit || {}), postalCode: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm">
                    <div className="text-neutral-600">City</div>
                    <input
                      className={inputBase}
                      value={state.unit?.city || ""}
                      onChange={(e) => update({ unit: { ...(state.unit || {}), city: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <div className="text-neutral-600">Lease type</div>
                    <input
                      className={inputBase}
                      value={state.unit?.leaseType || ""}
                      onChange={(e) => update({ unit: { ...(state.unit || {}), leaseType: e.target.value } })}
                      placeholder="e.g., furnished room, WG, fixed-term, unlimited..."
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <div className="text-neutral-600">Notes</div>
                    <textarea
                      className={textareaBase}
                      value={state.unit?.notes || ""}
                      onChange={(e) => update({ unit: { ...(state.unit || {}), notes: e.target.value } })}
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
                <div className="font-semibold">Landlord / representative</div>
                <div className="text-sm text-neutral-600 mt-1">Contact details for letters and logging.</div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="text-sm md:col-span-2">
                    <div className="text-neutral-600">Name</div>
                    <input
                      className={inputBase}
                      value={state.landlord?.name || ""}
                      onChange={(e) => update({ landlord: { ...(state.landlord || {}), name: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm">
                    <div className="text-neutral-600">Email</div>
                    <input
                      className={inputBase}
                      value={state.landlord?.email || ""}
                      onChange={(e) => update({ landlord: { ...(state.landlord || {}), email: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm">
                    <div className="text-neutral-600">Phone</div>
                    <input
                      className={inputBase}
                      value={state.landlord?.phone || ""}
                      onChange={(e) => update({ landlord: { ...(state.landlord || {}), phone: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <div className="text-neutral-600">Address line 1</div>
                    <input
                      className={inputBase}
                      value={state.landlord?.addressLine1 || ""}
                      onChange={(e) => update({ landlord: { ...(state.landlord || {}), addressLine1: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <div className="text-neutral-600">Address line 2</div>
                    <input
                      className={inputBase}
                      value={state.landlord?.addressLine2 || ""}
                      onChange={(e) => update({ landlord: { ...(state.landlord || {}), addressLine2: e.target.value } })}
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <div className="text-neutral-600">Notes</div>
                    <textarea
                      className={textareaBase}
                      value={state.landlord?.notes || ""}
                      onChange={(e) => update({ landlord: { ...(state.landlord || {}), notes: e.target.value } })}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {tab === "defects" && (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Defects</div>
                  <div className="text-sm text-neutral-600 mt-1">Track issues, status, and repair progress.</div>
                </div>
                <div className="w-40">
                  <ActionButton onClick={addDefect} tone="primary">
                    + Add
                  </ActionButton>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(state.defects || []).length === 0 ? (
                  <div className="text-sm text-neutral-600">No defects yet. Click “Add”.</div>
                ) : null}

                {(state.defects || []).map((d) => (
                  <div key={d.id} className="rounded-2xl border border-neutral-200 p-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full border ${pill(d.status)}`}>
                            {d.status || "Open"}
                          </span>
                          <input
                            className="w-full font-semibold text-neutral-900 bg-transparent outline-none"
                            value={d.title || ""}
                            onChange={(e) => {
                              const next = (state.defects || []).map((x) => (x.id === d.id ? { ...x, title: e.target.value } : x));
                              update({ defects: next });
                            }}
                          />
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                          <label className="text-sm">
                            <div className="text-neutral-600">Location</div>
                            <input
                              className={inputBase}
                              value={d.location || ""}
                              onChange={(e) => {
                                const next = (state.defects || []).map((x) => (x.id === d.id ? { ...x, location: e.target.value } : x));
                                update({ defects: next });
                              }}
                            />
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">First noted</div>
                            <input
                              type="date"
                              className={inputBase}
                              value={d.firstNoted || ""}
                              onChange={(e) => {
                                const next = (state.defects || []).map((x) => (x.id === d.id ? { ...x, firstNoted: e.target.value } : x));
                                update({ defects: next });
                              }}
                            />
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Status</div>
                            <select
                              className={inputBase}
                              value={d.status || "Open"}
                              onChange={(e) => {
                                const next = (state.defects || []).map((x) => (x.id === d.id ? { ...x, status: e.target.value } : x));
                                update({ defects: next });
                              }}
                            >
                              {["Open", "In Progress", "Resolved"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Severity</div>
                            <select
                              className={inputBase}
                              value={d.severity || "Medium"}
                              onChange={(e) => {
                                const next = (state.defects || []).map((x) => (x.id === d.id ? { ...x, severity: e.target.value } : x));
                                update({ defects: next });
                              }}
                            >
                              {["Low", "Medium", "High"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="text-sm">
                            <div className="text-neutral-600">Description</div>
                            <textarea
                              className={textareaBase}
                              value={d.description || ""}
                              onChange={(e) => {
                                const next = (state.defects || []).map((x) => (x.id === d.id ? { ...x, description: e.target.value } : x));
                                update({ defects: next });
                              }}
                            />
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Desired fix / next step</div>
                            <textarea
                              className={textareaBase}
                              value={d.desiredFix || ""}
                              onChange={(e) => {
                                const next = (state.defects || []).map((x) => (x.id === d.id ? { ...x, desiredFix: e.target.value } : x));
                                update({ defects: next });
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="w-full md:w-40 flex md:flex-col gap-2">
                        <ActionButton
                          tone="danger"
                          onClick={() => {
                            const next = (state.defects || []).filter((x) => x.id !== d.id);
                            update({ defects: next });
                          }}
                          title="Delete defect"
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "incidents" && (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Incidents</div>
                  <div className="text-sm text-neutral-600 mt-1">Log events with dates, details, and related evidence.</div>
                </div>
                <div className="w-40">
                  <ActionButton onClick={addIncident} tone="primary">
                    + Add
                  </ActionButton>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(state.incidents || []).length === 0 ? (
                  <div className="text-sm text-neutral-600">No incidents yet. Click “Add”.</div>
                ) : null}

                {(state.incidents || []).map((it) => (
                  <div key={it.id} className="rounded-2xl border border-neutral-200 p-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            className="w-full font-semibold text-neutral-900 bg-transparent outline-none"
                            value={it.title || ""}
                            onChange={(e) => {
                              const next = (state.incidents || []).map((x) => (x.id === it.id ? { ...x, title: e.target.value } : x));
                              update({ incidents: next });
                            }}
                          />
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                          <label className="text-sm">
                            <div className="text-neutral-600">Date</div>
                            <input
                              type="date"
                              className={inputBase}
                              value={it.date || ""}
                              onChange={(e) => {
                                const next = (state.incidents || []).map((x) => (x.id === it.id ? { ...x, date: e.target.value } : x));
                                update({ incidents: next });
                              }}
                            />
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Time (optional)</div>
                            <input
                              className={inputBase}
                              value={it.time || ""}
                              onChange={(e) => {
                                const next = (state.incidents || []).map((x) => (x.id === it.id ? { ...x, time: e.target.value } : x));
                                update({ incidents: next });
                              }}
                              placeholder="e.g., 14:30"
                            />
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Category</div>
                            <input
                              className={inputBase}
                              value={it.category || ""}
                              onChange={(e) => {
                                const next = (state.incidents || []).map((x) => (x.id === it.id ? { ...x, category: e.target.value } : x));
                                update({ incidents: next });
                              }}
                              placeholder="e.g., Heating, Access, Repairs..."
                            />
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Related defect</div>
                            <select
                              className={inputBase}
                              value={it.relatedDefectId || ""}
                              onChange={(e) => {
                                const next = (state.incidents || []).map((x) =>
                                  x.id === it.id ? { ...x, relatedDefectId: e.target.value } : x
                                );
                                update({ incidents: next });
                              }}
                            >
                              <option value="">None</option>
                              {(state.defects || []).map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.title || d.id}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="text-sm">
                            <div className="text-neutral-600">Description</div>
                            <textarea
                              className={textareaBase}
                              value={it.description || ""}
                              onChange={(e) => {
                                const next = (state.incidents || []).map((x) => (x.id === it.id ? { ...x, description: e.target.value } : x));
                                update({ incidents: next });
                              }}
                            />
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Evidence refs</div>
                            <textarea
                              className={textareaBase}
                              value={it.evidenceRefs || ""}
                              onChange={(e) => {
                                const next = (state.incidents || []).map((x) => (x.id === it.id ? { ...x, evidenceRefs: e.target.value } : x));
                                update({ incidents: next });
                              }}
                              placeholder="e.g., EV-2026-01-03-01, photo folder, WhatsApp screenshot..."
                            />
                          </label>
                        </div>
                      </div>

                      <div className="w-full md:w-40 flex md:flex-col gap-2">
                        <ActionButton
                          tone="danger"
                          onClick={() => {
                            const next = (state.incidents || []).filter((x) => x.id !== it.id);
                            update({ incidents: next });
                          }}
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "evidence" && (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Evidence index</div>
                  <div className="text-sm text-neutral-600 mt-1">Record where proof lives (file names, folders, links).</div>
                </div>
                <div className="w-40">
                  <ActionButton onClick={addEvidence} tone="primary">
                    + Add
                  </ActionButton>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(state.evidence || []).length === 0 ? (
                  <div className="text-sm text-neutral-600">No evidence yet. Click “Add”.</div>
                ) : null}

                {(state.evidence || []).map((ev) => (
                  <div key={ev.id} className="rounded-2xl border border-neutral-200 p-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            className="w-full font-semibold text-neutral-900 bg-transparent outline-none"
                            value={ev.label || ""}
                            onChange={(e) => {
                              const next = (state.evidence || []).map((x) => (x.id === ev.id ? { ...x, label: e.target.value } : x));
                              update({ evidence: next });
                            }}
                          />
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                          <label className="text-sm">
                            <div className="text-neutral-600">Date</div>
                            <input
                              type="date"
                              className={inputBase}
                              value={ev.date || ""}
                              onChange={(e) => {
                                const next = (state.evidence || []).map((x) => (x.id === ev.id ? { ...x, date: e.target.value } : x));
                                update({ evidence: next });
                              }}
                            />
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Type</div>
                            <select
                              className={inputBase}
                              value={ev.type || "Photo"}
                              onChange={(e) => {
                                const next = (state.evidence || []).map((x) => (x.id === ev.id ? { ...x, type: e.target.value } : x));
                                update({ evidence: next });
                              }}
                            >
                              {["Photo", "Video", "Audio", "Document", "Email", "Chat/Screenshot", "Other"].map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Storage</div>
                            <select
                              className={inputBase}
                              value={ev.storage || "Local"}
                              onChange={(e) => {
                                const next = (state.evidence || []).map((x) => (x.id === ev.id ? { ...x, storage: e.target.value } : x));
                                update({ evidence: next });
                              }}
                            >
                              {["Local", "Google Drive", "iCloud", "Email", "WhatsApp", "USB", "Other"].map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Reference</div>
                            <input
                              className={inputBase}
                              value={ev.reference || ""}
                              onChange={(e) => {
                                const next = (state.evidence || []).map((x) => (x.id === ev.id ? { ...x, reference: e.target.value } : x));
                                update({ evidence: next });
                              }}
                              placeholder="file name / folder / link"
                            />
                          </label>
                        </div>

                        <label className="text-sm mt-2 block">
                          <div className="text-neutral-600">Notes</div>
                          <textarea
                            className={textareaBase}
                            value={ev.notes || ""}
                            onChange={(e) => {
                              const next = (state.evidence || []).map((x) => (x.id === ev.id ? { ...x, notes: e.target.value } : x));
                              update({ evidence: next });
                            }}
                          />
                        </label>
                      </div>

                      <div className="w-full md:w-40 flex md:flex-col gap-2">
                        <ActionButton
                          tone="danger"
                          onClick={() => {
                            const next = (state.evidence || []).filter((x) => x.id !== ev.id);
                            update({ evidence: next });
                          }}
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "letters" && (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Letters / communication log</div>
                  <div className="text-sm text-neutral-600 mt-1">Track what was sent/received and references.</div>
                </div>
                <div className="w-40">
                  <ActionButton onClick={addLetter} tone="primary">
                    + Add
                  </ActionButton>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(state.correspondence || []).length === 0 ? (
                  <div className="text-sm text-neutral-600">No items yet. Click “Add”.</div>
                ) : null}

                {(state.correspondence || []).map((c) => (
                  <div key={c.id} className="rounded-2xl border border-neutral-200 p-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <label className="text-sm">
                            <div className="text-neutral-600">Date</div>
                            <input
                              type="date"
                              className={inputBase}
                              value={c.date || ""}
                              onChange={(e) => {
                                const next = (state.correspondence || []).map((x) => (x.id === c.id ? { ...x, date: e.target.value } : x));
                                update({ correspondence: next });
                              }}
                            />
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Channel</div>
                            <select
                              className={inputBase}
                              value={c.channel || "Email"}
                              onChange={(e) => {
                                const next = (state.correspondence || []).map((x) => (x.id === c.id ? { ...x, channel: e.target.value } : x));
                                update({ correspondence: next });
                              }}
                            >
                              {["Email", "Post", "WhatsApp", "Phone", "In person"].map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-sm md:col-span-2">
                            <div className="text-neutral-600">To / From</div>
                            <input
                              className={inputBase}
                              value={c.to || ""}
                              onChange={(e) => {
                                const next = (state.correspondence || []).map((x) => (x.id === c.id ? { ...x, to: e.target.value } : x));
                                update({ correspondence: next });
                              }}
                              placeholder="landlord / rep name"
                            />
                          </label>
                        </div>

                        <label className="text-sm mt-2 block">
                          <div className="text-neutral-600">Subject</div>
                          <input
                            className={inputBase}
                            value={c.subject || ""}
                            onChange={(e) => {
                              const next = (state.correspondence || []).map((x) => (x.id === c.id ? { ...x, subject: e.target.value } : x));
                              update({ correspondence: next });
                            }}
                          />
                        </label>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="text-sm">
                            <div className="text-neutral-600">Status</div>
                            <select
                              className={inputBase}
                              value={c.status || "Sent"}
                              onChange={(e) => {
                                const next = (state.correspondence || []).map((x) => (x.id === c.id ? { ...x, status: e.target.value } : x));
                                update({ correspondence: next });
                              }}
                            >
                              {["Draft", "Sent", "Received", "Follow-up"].map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-sm">
                            <div className="text-neutral-600">Reference</div>
                            <input
                              className={inputBase}
                              value={c.reference || ""}
                              onChange={(e) => {
                                const next = (state.correspondence || []).map((x) => (x.id === c.id ? { ...x, reference: e.target.value } : x));
                                update({ correspondence: next });
                              }}
                              placeholder="tracking # / email thread / file name"
                            />
                          </label>
                        </div>

                        <label className="text-sm mt-2 block">
                          <div className="text-neutral-600">Summary</div>
                          <textarea
                            className={textareaBase}
                            value={c.summary || ""}
                            onChange={(e) => {
                              const next = (state.correspondence || []).map((x) => (x.id === c.id ? { ...x, summary: e.target.value } : x));
                              update({ correspondence: next });
                            }}
                          />
                        </label>
                      </div>

                      <div className="w-full md:w-40 flex md:flex-col gap-2">
                        <ActionButton
                          tone="danger"
                          onClick={() => {
                            const next = (state.correspondence || []).filter((x) => x.id !== c.id);
                            update({ correspondence: next });
                          }}
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "rent" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
                <div className="font-semibold">Rent defaults</div>
                <div className="text-sm text-neutral-600 mt-1">Used for quick ledger entries.</div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="text-sm">
                    <div className="text-neutral-600">Cold rent</div>
                    <input
                      type="number"
                      step="10"
                      className={inputBase}
                      value={state.rent?.coldRent ?? 0}
                      onChange={(e) => update({ rent: { ...(state.rent || {}), coldRent: toNum(e.target.value, 0) } })}
                    />
                  </label>

                  <label className="text-sm">
                    <div className="text-neutral-600">Warm rent</div>
                    <input
                      type="number"
                      step="10"
                      className={inputBase}
                      value={state.rent?.warmRent ?? 0}
                      onChange={(e) => update({ rent: { ...(state.rent || {}), warmRent: toNum(e.target.value, 0) } })}
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <div className="text-neutral-600">Extras note</div>
                    <textarea
                      className={textareaBase}
                      value={state.rent?.extrasNote || ""}
                      onChange={(e) => update({ rent: { ...(state.rent || {}), extrasNote: e.target.value } })}
                    />
                  </label>
                </div>

                <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                  Ledger totals — Due: <span className="font-semibold">{EUR(rentSummary.totalDue)}</span> • Paid:{" "}
                  <span className="font-semibold">{EUR(rentSummary.totalPaid)}</span> • Balance:{" "}
                  <span className="font-semibold">{EUR(rentSummary.balance)}</span>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">Rent ledger</div>
                    <div className="text-sm text-neutral-600 mt-1">Track due vs paid per month.</div>
                  </div>
                  <div className="w-40">
                    <ActionButton onClick={addLedgerRow} tone="primary">
                      + Add
                    </ActionButton>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {(state.ledger || []).length === 0 ? (
                    <div className="text-sm text-neutral-600">No ledger rows yet. Click “Add”.</div>
                  ) : null}

                  {(state.ledger || []).map((r) => (
                    <div key={r.id} className="rounded-2xl border border-neutral-200 p-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <label className="text-sm">
                          <div className="text-neutral-600">Month</div>
                          <input
                            className={inputBase}
                            value={r.month || ""}
                            onChange={(e) => {
                              const next = (state.ledger || []).map((x) => (x.id === r.id ? { ...x, month: e.target.value } : x));
                              update({ ledger: next });
                            }}
                            placeholder="YYYY-MM"
                          />
                        </label>

                        <label className="text-sm">
                          <div className="text-neutral-600">Due</div>
                          <input
                            type="number"
                            step="10"
                            className={inputBase}
                            value={r.due ?? 0}
                            onChange={(e) => {
                              const next = (state.ledger || []).map((x) => (x.id === r.id ? { ...x, due: toNum(e.target.value, 0) } : x));
                              update({ ledger: next });
                            }}
                          />
                        </label>

                        <label className="text-sm">
                          <div className="text-neutral-600">Paid</div>
                          <input
                            type="number"
                            step="10"
                            className={inputBase}
                            value={r.paid ?? 0}
                            onChange={(e) => {
                              const next = (state.ledger || []).map((x) => (x.id === r.id ? { ...x, paid: toNum(e.target.value, 0) } : x));
                              update({ ledger: next });
                            }}
                          />
                        </label>

                        <label className="text-sm">
                          <div className="text-neutral-600">Date paid</div>
                          <input
                            type="date"
                            className={inputBase}
                            value={r.datePaid || ""}
                            onChange={(e) => {
                              const next = (state.ledger || []).map((x) => (x.id === r.id ? { ...x, datePaid: e.target.value } : x));
                              update({ ledger: next });
                            }}
                          />
                        </label>

                        <label className="text-sm md:col-span-2">
                          <div className="text-neutral-600">Method</div>
                          <input
                            className={inputBase}
                            value={r.method || ""}
                            onChange={(e) => {
                              const next = (state.ledger || []).map((x) => (x.id === r.id ? { ...x, method: e.target.value } : x));
                              update({ ledger: next });
                            }}
                            placeholder="Transfer / Cash / ..."
                          />
                        </label>

                        <label className="text-sm md:col-span-2">
                          <div className="text-neutral-600">Note</div>
                          <input
                            className={inputBase}
                            value={r.note || ""}
                            onChange={(e) => {
                              const next = (state.ledger || []).map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x));
                              update({ ledger: next });
                            }}
                            placeholder="e.g., 30% reduction, heating defect..."
                          />
                        </label>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className="h-9 px-3 rounded-xl text-sm font-medium border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition shadow-sm active:translate-y-[1px]"
                          onClick={() => {
                            const next = (state.ledger || []).filter((x) => x.id !== r.id);
                            update({ ledger: next });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer link */}
        <div className="mt-6 text-sm text-neutral-600">
          <a className="underline hover:text-neutral-900" href={HUB_URL} target="_blank" rel="noreferrer">
            Return to ToolStack hub
          </a>
          <div className="mt-2 text-xs text-neutral-500">
            Storage key: <span className="font-mono">{KEY}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
