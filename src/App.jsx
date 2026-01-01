// RentIt (ToolStack) — module-ready MVP (Styled v1: grey + lime/green accent)
// Updated: Normalized Top Actions + pinned far-right Help "?" icon + Help Pack v1 modal (CONSISTENT v1.0)
// Paste into: src/App.jsx
// Requires: Tailwind v4 configured (same as other ToolStack apps).

import React, { useEffect, useMemo, useRef, useState } from "react";

const APP_ID = "rentit";
const APP_VERSION = "v1";

// Per-module storage namespace
const KEY = `toolstack.${APP_ID}.${APP_VERSION}`;

// Shared profile (used by all modules later)
const PROFILE_KEY = "toolstack.profile.v1";

// Put your real ToolStack hub URL here (Wix page)
const HUB_URL = "https://YOUR-WIX-HUB-URL-HERE";

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function uid(prefix = "id") {
  return (
    crypto?.randomUUID?.() ||
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function loadProfile() {
  return (
    safeParse(localStorage.getItem(PROFILE_KEY), null) || {
      org: "ToolStack",
      user: "",
      language: "EN",
      logo: "",
    }
  );
}

function defaultState() {
  return {
    meta: {
      appId: APP_ID,
      version: APP_VERSION,
      updatedAt: new Date().toISOString(),
    },
    unit: {
      label: "",
      address: "",
      moveInDate: "",
      warmRent: 0,
      coldRent: 0,
      deposit: 0,
      notes: "",
      landlord: {
        name: "",
        email: "",
        phone: "",
        address: "",
      },
    },
    costs: {
      currency: "EUR",
      recurring: [
        { id: uid("c"), label: "Warm rent", amount: 0, freq: "monthly" },
        { id: uid("c"), label: "Electricity", amount: 0, freq: "monthly" },
        { id: uid("c"), label: "Internet", amount: 0, freq: "monthly" },
      ],
      oneOff: [{ id: uid("o"), label: "Deposit", amount: 0 }],
    },
    issues: [],
    incidents: [],
  };
}

/** Optional: legacy migration hook placeholder */
function migrateIfNeeded() {
  // If you later want to migrate from old Mietakte keys, do it here.
  // const legacy = localStorage.getItem("toolstack.mietakte.v1");
  // if (legacy && !localStorage.getItem(KEY)) localStorage.setItem(KEY, legacy);
}

function loadState() {
  migrateIfNeeded();
  return safeParse(localStorage.getItem(KEY), null) || defaultState();
}

function saveState(state) {
  const next = {
    ...state,
    meta: { ...state.meta, updatedAt: new Date().toISOString() },
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

function toNum(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function moneyFmt(n, currency) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  return `${x.toFixed(2)} ${currency}`;
}

const inputBase =
  "w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/25 focus:border-neutral-300";

const badge = {
  open: "bg-amber-100 text-amber-800 border-amber-200",
  progress: "bg-sky-100 text-sky-800 border-sky-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  low: "bg-neutral-100 text-neutral-700 border-neutral-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

/** Normalized Top Actions (mobile-aligned “table/grid”) */
const ACTION_BASE =
  "print:hidden h-10 w-full rounded-xl text-sm font-medium border transition shadow-sm active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";

function ActionButton({ children, onClick, tone = "default", disabled, title }) {
  const cls =
    tone === "primary"
      ? "bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-900"
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

function ActionFileButton({
  children,
  onFile,
  accept = "application/json",
  tone = "primary",
  title,
}) {
  const cls =
    tone === "primary"
      ? "bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-900"
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

/** Help icon + modal (Help Pack v1.0 — CONSISTENT ACROSS ALL APPS) */
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
      <path
        d="M12 17h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
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
              <div className="text-sm text-neutral-600 mt-1">
                Autosave, backups, and continuity (Help Pack v1.0)
              </div>
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
              <li>
                If you clear browser data, use a different browser/device, or use
                private/incognito mode, data may not be there.
              </li>
              <li>
                Use <span className="font-medium">Export</span> to create a backup
                file you control.
              </li>
              <li>
                Use <span className="font-medium">Import</span> to restore a backup
                (it replaces the current app data).
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="font-semibold text-neutral-900">Recommended routine</div>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>
                Export after important updates (new incidents, payments, evidence
                references, or major edits).
              </li>
              <li>
                Keep backups in a folder like:{" "}
                <span className="font-mono text-xs">
                  ToolStack/Backups/&lt;AppName&gt;
                </span>
                .
              </li>
              <li>
                Use <span className="font-medium">Preview → Print / Save PDF</span>{" "}
                when you need a clean report for sharing.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="font-semibold text-neutral-900">Export / Import rules</div>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>
                Export creates a JSON backup file you can store anywhere (Drive,
                email to yourself, USB).
              </li>
              <li>Import restores from that JSON backup and overwrites current app data.</li>
              <li>Before importing, export your current state first (so you can roll back if needed).</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="font-semibold text-neutral-900">Printing / PDF</div>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>
                Use <span className="font-medium">Preview</span> to check the report.
              </li>
              <li>
                Use <span className="font-medium">Print / Save PDF</span> to generate a PDF from the preview report.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="font-semibold text-neutral-900">Troubleshooting</div>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>
                If data “disappeared”, you are likely in a different browser/device/profile or you cleared site data.
              </li>
              <li>Import your latest backup JSON to restore instantly.</li>
              <li>Avoid private/incognito mode for long-term records.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="font-semibold text-neutral-900">Storage keys</div>
            <div className="mt-2 space-y-1">
              <div className="text-neutral-700">
                App data: <span className="font-mono text-xs">{storageKey}</span>
              </div>
              <div className="text-neutral-700">
                Shared profile: <span className="font-mono text-xs">{profileKey}</span>
              </div>
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

export default function App() {
  const [profile, setProfile] = useState(loadProfile());
  const [state, setState] = useState(loadState());

  const [helpOpen, setHelpOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Incident filters
  const [from, setFrom] = useState(() => {
    const t = isoToday();
    return t.slice(0, 7) + "-01";
  });
  const [to, setTo] = useState(isoToday());

  // Draft issue
  const [issueTitle, setIssueTitle] = useState("");
  const [issueRoom, setIssueRoom] = useState("");
  const [issueStatus, setIssueStatus] = useState("open"); // open | progress | resolved
  const [issueSeverity, setIssueSeverity] = useState("medium"); // low | medium | high
  const [issueDetails, setIssueDetails] = useState("");
  const [issueEvidence, setIssueEvidence] = useState("");

  // Draft incident
  const [incDate, setIncDate] = useState(isoToday());
  const [incType, setIncType] = useState("maintenance"); // maintenance | landlord | neighbor | payment | other
  const [incSeverity, setIncSeverity] = useState("medium");
  const [incSummary, setIncSummary] = useState("");
  const [incDetails, setIncDetails] = useState("");
  const [incEvidence, setIncEvidence] = useState("");

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const currency = state.costs?.currency || "EUR";

  function clampMoney(v) {
    return round2(Math.max(0, toNum(v, 0)));
  }

  function updateUnit(patch) {
    setState((prev) => saveState({ ...prev, unit: { ...prev.unit, ...patch } }));
  }

  function updateLandlord(patch) {
    setState((prev) =>
      saveState({
        ...prev,
        unit: {
          ...prev.unit,
          landlord: { ...(prev.unit?.landlord || {}), ...patch },
        },
      })
    );
  }

  function updateCostGroup(key, items) {
    setState((prev) =>
      saveState({
        ...prev,
        costs: { ...prev.costs, [key]: items },
      })
    );
  }

  function addRecurring() {
    const next = [...(state.costs?.recurring || [])];
    next.push({ id: uid("c"), label: "", amount: 0, freq: "monthly" });
    updateCostGroup("recurring", next);
  }

  function addOneOff() {
    const next = [...(state.costs?.oneOff || [])];
    next.push({ id: uid("o"), label: "", amount: 0 });
    updateCostGroup("oneOff", next);
  }

  function updateRecurring(id, patch) {
    updateCostGroup(
      "recurring",
      (state.costs?.recurring || []).map((x) => (x.id === id ? { ...x, ...patch } : x))
    );
  }

  function deleteRecurring(id) {
    updateCostGroup(
      "recurring",
      (state.costs?.recurring || []).filter((x) => x.id !== id)
    );
  }

  function updateOneOff(id, patch) {
    updateCostGroup(
      "oneOff",
      (state.costs?.oneOff || []).map((x) => (x.id === id ? { ...x, ...patch } : x))
    );
  }

  function deleteOneOff(id) {
    updateCostGroup(
      "oneOff",
      (state.costs?.oneOff || []).filter((x) => x.id !== id)
    );
  }

  function addIssue() {
    const title = String(issueTitle || "").trim();
    if (!title) return;

    const it = {
      id: uid("iss"),
      createdAt: new Date().toISOString(),
      title,
      room: String(issueRoom || "").trim(),
      status: issueStatus,
      severity: issueSeverity,
      details: String(issueDetails || "").trim(),
      evidenceRef: String(issueEvidence || "").trim(),
    };

    setState((prev) => saveState({ ...prev, issues: [it, ...(prev.issues || [])] }));

    setIssueTitle("");
    setIssueRoom("");
    setIssueStatus("open");
    setIssueSeverity("medium");
    setIssueDetails("");
    setIssueEvidence("");
  }

  function updateIssue(id, patch) {
    setState((prev) =>
      saveState({
        ...prev,
        issues: (prev.issues || []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
      })
    );
  }

  function deleteIssue(id) {
    setState((prev) => saveState({ ...prev, issues: (prev.issues || []).filter((x) => x.id !== id) }));
  }

  function addIncident() {
    const summary = String(incSummary || "").trim();
    if (!summary) return;

    const it = {
      id: uid("inc"),
      createdAt: new Date().toISOString(),
      date: incDate || isoToday(),
      type: incType,
      severity: incSeverity,
      summary,
      details: String(incDetails || "").trim(),
      evidenceRef: String(incEvidence || "").trim(),
    };

    setState((prev) => saveState({ ...prev, incidents: [it, ...(prev.incidents || [])] }));

    setIncDate(isoToday());
    setIncType("maintenance");
    setIncSeverity("medium");
    setIncSummary("");
    setIncDetails("");
    setIncEvidence("");
  }

  function deleteIncident(id) {
    setState((prev) => saveState({ ...prev, incidents: (prev.incidents || []).filter((x) => x.id !== id) }));
  }

  function exportJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      data: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toolstack-rentit-${APP_VERSION}-${isoToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const incoming = parsed?.data;
        if (!incoming?.unit || !incoming?.costs) throw new Error("Invalid import file");
        setProfile(parsed?.profile || profile);
        setState(saveState(incoming));
      } catch (e) {
        alert("Import failed: " + (e?.message || "unknown error"));
      }
    };
    reader.readAsText(file);
  }

  function printPreview() {
    // Print only the preview sheet
    setPreviewOpen(true);
    setTimeout(() => window.print(), 80);
  }

  const recurringMonthlyTotal = useMemo(() => {
    const items = state.costs?.recurring || [];
    let sum = 0;
    for (const it of items) {
      const amt = clampMoney(it.amount);
      if (it.freq === "yearly") sum += amt / 12;
      else if (it.freq === "weekly") sum += (amt * 52) / 12;
      else sum += amt;
    }
    return round2(sum);
  }, [state.costs?.recurring]);

  const oneOffTotal = useMemo(() => {
    const items = state.costs?.oneOff || [];
    return round2(items.reduce((s, it) => s + clampMoney(it.amount), 0));
  }, [state.costs?.oneOff]);

  const openIssueCount = useMemo(() => {
    return (state.issues || []).filter((x) => x.status !== "resolved").length;
  }, [state.issues]);

  const issuesByStatus = useMemo(() => {
    const all = state.issues || [];
    const open = all.filter((x) => x.status === "open");
    const progress = all.filter((x) => x.status === "progress");
    const resolved = all.filter((x) => x.status === "resolved");
    return { open, progress, resolved };
  }, [state.issues]);

  const incidentsFiltered = useMemo(() => {
    const all = state.incidents || [];
    return all
      .filter((x) => (x.date || "") >= from && (x.date || "") <= to)
      .sort((a, b) =>
        `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`)
      );
  }, [state.incidents, from, to]);

  const moduleManifest = useMemo(
    () => ({
      id: APP_ID,
      name: "RentIt",
      version: APP_VERSION,
      storageKeys: [KEY, PROFILE_KEY],
      exports: ["print", "json"],
    }),
    []
  );

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

      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        storageKey={KEY}
        profileKey={PROFILE_KEY}
      />

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight">RentIt</div>
            <div className="text-sm text-neutral-600">
              Module-ready ({moduleManifest.id}.{moduleManifest.version}) • Unit + Landlord • Costs • Issues • Incident log
            </div>
            <div className="mt-3 h-[2px] w-80 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />
          </div>

          {/* Normalized top actions grid + pinned help icon */}
          <div className="w-full sm:w-[760px]">
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ActionButton onClick={() => setPreviewOpen(true)}>Preview</ActionButton>
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

        {/* Preview modal */}
        {previewOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-3 z-50">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <div className="font-semibold">Preview — RentIt report</div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm transition"
                    onClick={printPreview}
                  >
                    Print / Save PDF
                  </button>
                  <button
                    className="px-3 py-2 rounded-xl text-sm font-medium border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm transition"
                    onClick={() => setPreviewOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-auto max-h-[80vh]">
                <div id="rentit-print">
                  <div className="text-xl font-bold">{profile.org || "ToolStack"}</div>
                  <div className="text-sm text-neutral-600">Rental unit report</div>
                  <div className="mt-2 h-[2px] w-72 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />

                  <div className="mt-3 text-sm">
                    <div>
                      <span className="text-neutral-600">Prepared by:</span> {profile.user || "-"}
                    </div>
                    <div>
                      <span className="text-neutral-600">Generated:</span> {new Date().toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-neutral-200 p-3 text-sm">
                    <div className="font-semibold">Unit</div>
                    <div className="mt-1 text-neutral-700">Label: {state.unit?.label || "-"}</div>
                    <div className="text-neutral-700">Address: {state.unit?.address || "-"}</div>
                    <div className="text-neutral-700">Move-in: {state.unit?.moveInDate || "-"}</div>
                    <div className="text-neutral-700">Warm rent (ref): {moneyFmt(state.unit?.warmRent || 0, currency)}</div>
                    <div className="text-neutral-700">Cold rent (ref): {moneyFmt(state.unit?.coldRent || 0, currency)}</div>
                    <div className="text-neutral-700">Deposit (ref): {moneyFmt(state.unit?.deposit || 0, currency)}</div>
                    {state.unit?.notes ? (
                      <div className="mt-2 text-neutral-700 whitespace-pre-wrap">Notes: {state.unit.notes}</div>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-2xl border border-neutral-200 p-3 text-sm">
                    <div className="font-semibold">Landlord</div>
                    <div className="mt-1 text-neutral-700">Name: {state.unit?.landlord?.name || "-"}</div>
                    <div className="text-neutral-700">Email: {state.unit?.landlord?.email || "-"}</div>
                    <div className="text-neutral-700">Phone: {state.unit?.landlord?.phone || "-"}</div>
                    <div className="text-neutral-700">Address: {state.unit?.landlord?.address || "-"}</div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-neutral-200 p-3 text-sm">
                    <div className="font-semibold">Costs</div>
                    <div className="mt-1 text-neutral-700">
                      Recurring (monthly estimate):{" "}
                      <span className="font-semibold">{moneyFmt(recurringMonthlyTotal, currency)}</span>
                    </div>
                    <div className="text-neutral-700">
                      One-off total: <span className="font-semibold">{moneyFmt(oneOffTotal, currency)}</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-neutral-200 p-3 text-sm">
                    <div className="font-semibold">Issues</div>
                    <div className="mt-1 text-neutral-700">Open issues: {openIssueCount}</div>
                    <div className="mt-2 space-y-2">
                      {(state.issues || []).slice(0, 12).map((x) => (
                        <div key={x.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                          <div>
                            <div className="font-medium">{x.title}</div>
                            <div className="text-neutral-600 text-sm">
                              {x.room ? `${x.room} • ` : ""}
                              {x.status}
                              <span className={`ml-2 text-xs px-2 py-1 rounded-full border ${badge[x.severity] || badge.medium}`}>
                                {x.severity}
                              </span>
                            </div>
                            {x.details ? <div className="text-neutral-700 text-sm">{x.details}</div> : null}
                            {x.evidenceRef ? <div className="text-neutral-600 text-sm">Evidence: {x.evidenceRef}</div> : null}
                          </div>
                        </div>
                      ))}
                      {(state.issues || []).length > 12 ? (
                        <div className="text-neutral-500 text-xs">(Showing first 12 issues)</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-neutral-200 p-3 text-sm">
                    <div className="font-semibold">Incident log</div>
                    <div className="mt-1 text-neutral-700">Range: {from} → {to}</div>
                    <div className="mt-2 space-y-2">
                      {incidentsFiltered.slice(0, 12).map((x) => (
                        <div key={x.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                          <div className="text-neutral-600">
                            {x.date} • {x.type}
                            <span className={`ml-2 text-xs px-2 py-1 rounded-full border ${badge[x.severity] || badge.medium}`}>
                              {x.severity}
                            </span>
                          </div>
                          <div className="font-medium">{x.summary}</div>
                          {x.details ? <div className="text-neutral-700">{x.details}</div> : null}
                          {x.evidenceRef ? <div className="text-neutral-600">Evidence: {x.evidenceRef}</div> : null}
                        </div>
                      ))}
                      {incidentsFiltered.length > 12 ? (
                        <div className="text-neutral-500 text-xs">(Showing first 12 incidents in range)</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <div className="text-neutral-600">Tenant</div>
                      <div className="mt-8 border-t pt-2">Signature</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Landlord / Agent</div>
                      <div className="mt-8 border-t pt-2">Signature</div>
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

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Profile (shared) */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
            <div className="font-semibold">Profile (shared)</div>
            <div className="mt-3 space-y-2">
              <label className="block text-sm">
                <div className="text-neutral-600">Organization</div>
                <input
                  className={inputBase}
                  value={profile.org}
                  onChange={(e) => setProfile({ ...profile, org: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <div className="text-neutral-600">User</div>
                <input
                  className={inputBase}
                  value={profile.user}
                  onChange={(e) => setProfile({ ...profile, user: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <div className="text-neutral-600">Language</div>
                <select
                  className={inputBase}
                  value={profile.language}
                  onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                >
                  <option value="EN">EN</option>
                  <option value="DE">DE</option>
                </select>
              </label>
              <div className="pt-2 text-xs text-neutral-500">
                Stored at <span className="font-mono">{PROFILE_KEY}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="font-semibold">Snapshot</div>
              <div className="mt-1 text-sm text-neutral-700">
                Open issues: <span className="font-semibold">{openIssueCount}</span>
              </div>
              <div className="text-sm text-neutral-700">
                Recurring / month (est.):{" "}
                <span className="font-semibold">{moneyFmt(recurringMonthlyTotal, currency)}</span>
              </div>
              <div className="text-sm text-neutral-700">
                One-off total: <span className="font-semibold">{moneyFmt(oneOffTotal, currency)}</span>
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                Storage key: <span className="font-mono">{KEY}</span>
              </div>
            </div>
          </div>

          {/* Unit + costs */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4 lg:col-span-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-semibold">Unit & landlord</div>
                <div className="text-sm text-neutral-600">
                  Keep everything in one place — clean, printable, exportable.
                </div>
              </div>
            </div>

            {/* Unit details */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-sm">
                <div className="text-neutral-600">Unit label</div>
                <input
                  className={inputBase}
                  value={state.unit?.label || ""}
                  onChange={(e) => updateUnit({ label: e.target.value })}
                  placeholder="e.g., Room 3 / Flat A"
                />
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Move-in date</div>
                <input
                  type="date"
                  className={inputBase}
                  value={state.unit?.moveInDate || ""}
                  onChange={(e) => updateUnit({ moveInDate: e.target.value })}
                />
              </label>
              <label className="text-sm md:col-span-2">
                <div className="text-neutral-600">Address</div>
                <input
                  className={inputBase}
                  value={state.unit?.address || ""}
                  onChange={(e) => updateUnit({ address: e.target.value })}
                  placeholder="Street, City"
                />
              </label>

              <label className="text-sm">
                <div className="text-neutral-600">Warm rent (reference)</div>
                <input
                  type="number"
                  step="0.01"
                  className={inputBase}
                  value={state.unit?.warmRent ?? 0}
                  onChange={(e) => updateUnit({ warmRent: toNum(e.target.value, 0) })}
                />
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Cold rent (reference)</div>
                <input
                  type="number"
                  step="0.01"
                  className={inputBase}
                  value={state.unit?.coldRent ?? 0}
                  onChange={(e) => updateUnit({ coldRent: toNum(e.target.value, 0) })}
                />
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Deposit (reference)</div>
                <input
                  type="number"
                  step="0.01"
                  className={inputBase}
                  value={state.unit?.deposit ?? 0}
                  onChange={(e) => updateUnit({ deposit: toNum(e.target.value, 0) })}
                />
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Currency</div>
                <input
                  className={inputBase}
                  value={currency}
                  onChange={(e) =>
                    setState((prev) =>
                      saveState({
                        ...prev,
                        costs: { ...prev.costs, currency: e.target.value.toUpperCase() },
                      })
                    )
                  }
                />
              </label>
            </div>

            <label className="block text-sm mt-3">
              <div className="text-neutral-600">Unit notes</div>
              <textarea
                className={`${inputBase} min-h-[80px]`}
                value={state.unit?.notes || ""}
                onChange={(e) => updateUnit({ notes: e.target.value })}
                placeholder="Contract notes, meter readings, agreements, etc."
              />
            </label>

            {/* Landlord details */}
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="font-semibold">Landlord details</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="text-sm">
                  <div className="text-neutral-600">Name</div>
                  <input
                    className={inputBase}
                    value={state.unit?.landlord?.name || ""}
                    onChange={(e) => updateLandlord({ name: e.target.value })}
                    placeholder="Full name"
                  />
                </label>
                <label className="text-sm">
                  <div className="text-neutral-600">Email</div>
                  <input
                    className={inputBase}
                    value={state.unit?.landlord?.email || ""}
                    onChange={(e) => updateLandlord({ email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="text-sm">
                  <div className="text-neutral-600">Phone</div>
                  <input
                    className={inputBase}
                    value={state.unit?.landlord?.phone || ""}
                    onChange={(e) => updateLandlord({ phone: e.target.value })}
                    placeholder="+49 ..."
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  <div className="text-neutral-600">Physical address</div>
                  <input
                    className={inputBase}
                    value={state.unit?.landlord?.address || ""}
                    onChange={(e) => updateLandlord({ address: e.target.value })}
                    placeholder="Street, City"
                  />
                </label>
              </div>
            </div>

            {/* Costs */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">Recurring costs</div>
                  <button
                    className="print:hidden px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 active:translate-y-[1px] transition"
                    onClick={addRecurring}
                  >
                    + Item
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {(state.costs?.recurring || []).length === 0 ? (
                    <div className="text-sm text-neutral-500">Add recurring items (monthly, weekly, yearly).</div>
                  ) : (
                    (state.costs?.recurring || []).map((it) => (
                      <div key={it.id} className="rounded-xl bg-white border border-neutral-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium">{it.label || "Recurring item"}</div>
                          <button
                            className="print:hidden px-3 py-1.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50"
                            onClick={() => deleteRecurring(it.id)}
                          >
                            Delete
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                          <label className="text-sm">
                            <div className="text-neutral-600">Label</div>
                            <input
                              className={inputBase}
                              value={it.label}
                              onChange={(e) => updateRecurring(it.id, { label: e.target.value })}
                            />
                          </label>
                          <label className="text-sm">
                            <div className="text-neutral-600">Amount</div>
                            <input
                              type="number"
                              step="0.01"
                              className={inputBase}
                              value={it.amount}
                              onChange={(e) => updateRecurring(it.id, { amount: toNum(e.target.value, 0) })}
                            />
                          </label>
                          <label className="text-sm">
                            <div className="text-neutral-600">Frequency</div>
                            <select
                              className={inputBase}
                              value={it.freq || "monthly"}
                              onChange={(e) => updateRecurring(it.id, { freq: e.target.value })}
                            >
                              <option value="monthly">Monthly</option>
                              <option value="weekly">Weekly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 text-sm text-neutral-700">
                  Estimated monthly total:{" "}
                  <span className="font-semibold">{moneyFmt(recurringMonthlyTotal, currency)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">One-off costs</div>
                  <button
                    className="print:hidden px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 active:translate-y-[1px] transition"
                    onClick={addOneOff}
                  >
                    + Item
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {(state.costs?.oneOff || []).length === 0 ? (
                    <div className="text-sm text-neutral-500">Add one-off items (deposit, repairs you paid, etc.).</div>
                  ) : (
                    (state.costs?.oneOff || []).map((it) => (
                      <div key={it.id} className="rounded-xl bg-white border border-neutral-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium">{it.label || "One-off item"}</div>
                          <button
                            className="print:hidden px-3 py-1.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50"
                            onClick={() => deleteOneOff(it.id)}
                          >
                            Delete
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="text-sm">
                            <div className="text-neutral-600">Label</div>
                            <input
                              className={inputBase}
                              value={it.label}
                              onChange={(e) => updateOneOff(it.id, { label: e.target.value })}
                            />
                          </label>
                          <label className="text-sm">
                            <div className="text-neutral-600">Amount</div>
                            <input
                              type="number"
                              step="0.01"
                              className={inputBase}
                              value={it.amount}
                              onChange={(e) => updateOneOff(it.id, { amount: toNum(e.target.value, 0) })}
                            />
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 text-sm text-neutral-700">
                  One-off total: <span className="font-semibold">{moneyFmt(oneOffTotal, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Issues + Incidents */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Issues */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold">Issues</div>
                <div className="text-sm text-neutral-600">Track defects, repairs, landlord failures, etc.</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-sm md:col-span-2">
                <div className="text-neutral-600">Title</div>
                <input
                  className={inputBase}
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="e.g., Heating not working in bedroom"
                />
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Room / Area</div>
                <input
                  className={inputBase}
                  value={issueRoom}
                  onChange={(e) => setIssueRoom(e.target.value)}
                  placeholder="e.g., Bedroom"
                />
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Status</div>
                <select
                  className={inputBase}
                  value={issueStatus}
                  onChange={(e) => setIssueStatus(e.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Severity</div>
                <select
                  className={inputBase}
                  value={issueSeverity}
                  onChange={(e) => setIssueSeverity(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Evidence ref</div>
                <input
                  className={inputBase}
                  value={issueEvidence}
                  onChange={(e) => setIssueEvidence(e.target.value)}
                  placeholder="Photo # / email date / file name"
                />
              </label>
              <label className="text-sm md:col-span-2">
                <div className="text-neutral-600">Details</div>
                <textarea
                  className={`${inputBase} min-h-[80px]`}
                  value={issueDetails}
                  onChange={(e) => setIssueDetails(e.target.value)}
                  placeholder="What happened, when, impact, what you want fixed"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <button
                className="print:hidden px-3 py-2 rounded-xl text-sm font-medium border border-neutral-900 bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 active:translate-y-[1px] transition"
                onClick={addIssue}
              >
                Add issue
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {state.issues?.length ? (
                <>
                  <IssueGroup title="Open" items={issuesByStatus.open} onUpdate={updateIssue} onDelete={deleteIssue} />
                  <IssueGroup
                    title="In progress"
                    items={issuesByStatus.progress}
                    onUpdate={updateIssue}
                    onDelete={deleteIssue}
                  />
                  <IssueGroup
                    title="Resolved"
                    items={issuesByStatus.resolved}
                    onUpdate={updateIssue}
                    onDelete={deleteIssue}
                    muted
                  />
                </>
              ) : (
                <div className="text-sm text-neutral-500">No issues yet.</div>
              )}
            </div>
          </div>

          {/* Incidents */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold">Incident log</div>
                <div className="text-sm text-neutral-600">One entry per event (email, call, viewing, repair, dispute).</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-sm">
                <div className="text-neutral-600">Date</div>
                <input type="date" className={inputBase} value={incDate} onChange={(e) => setIncDate(e.target.value)} />
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Type</div>
                <select className={inputBase} value={incType} onChange={(e) => setIncType(e.target.value)}>
                  <option value="maintenance">Maintenance</option>
                  <option value="landlord">Landlord/Agent</option>
                  <option value="neighbor">Neighbor</option>
                  <option value="payment">Payment/Rent</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Severity</div>
                <select className={inputBase} value={incSeverity} onChange={(e) => setIncSeverity(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="text-neutral-600">Evidence ref</div>
                <input
                  className={inputBase}
                  value={incEvidence}
                  onChange={(e) => setIncEvidence(e.target.value)}
                  placeholder="Email subject / photo # / file"
                />
              </label>
              <label className="text-sm md:col-span-2">
                <div className="text-neutral-600">Summary</div>
                <input
                  className={inputBase}
                  value={incSummary}
                  onChange={(e) => setIncSummary(e.target.value)}
                  placeholder="Short: what happened"
                />
              </label>
              <label className="text-sm md:col-span-2">
                <div className="text-neutral-600">Details</div>
                <textarea
                  className={`${inputBase} min-h-[90px]`}
                  value={incDetails}
                  onChange={(e) => setIncDetails(e.target.value)}
                  placeholder="Facts, times, who said what, next step"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-neutral-600">Tip: put evidence IDs you can cross-reference later.</div>
              <button
                className="print:hidden px-3 py-2 rounded-xl text-sm font-medium border border-neutral-900 bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 active:translate-y-[1px] transition"
                onClick={addIncident}
              >
                Add incident
              </button>
            </div>

            {/* Filters */}
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">Incidents (filtered)</div>
                  <div className="text-sm text-neutral-600">
                    From {from} to {to}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <label className="text-sm">
                    <div className="text-neutral-600">From</div>
                    <input type="date" className={inputBase} value={from} onChange={(e) => setFrom(e.target.value)} />
                  </label>
                  <label className="text-sm">
                    <div className="text-neutral-600">To</div>
                    <input type="date" className={inputBase} value={to} onChange={(e) => setTo(e.target.value)} />
                  </label>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                {incidentsFiltered.length === 0 ? (
                  <div className="text-sm text-neutral-500">No incidents in this range.</div>
                ) : (
                  incidentsFiltered.map((x) => (
                    <div key={x.id} className="rounded-xl bg-white border border-neutral-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm text-neutral-600">
                            <span className="font-medium text-neutral-900">{x.date}</span> • {x.type}
                            <span className={`ml-2 text-xs px-2 py-1 rounded-full border ${badge[x.severity] || badge.medium}`}>
                              {x.severity}
                            </span>
                          </div>
                          <div className="font-semibold">{x.summary}</div>
                          {x.details ? (
                            <div className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap">{x.details}</div>
                          ) : null}
                          {x.evidenceRef ? (
                            <div className="mt-1 text-sm text-neutral-600">Evidence: {x.evidenceRef}</div>
                          ) : null}
                        </div>
                        <button
                          className="print:hidden px-3 py-1.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50"
                          onClick={() => deleteIncident(x.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer link */}
        <div className="mt-6 text-sm text-neutral-600">
          <a className="underline hover:text-neutral-900" href={HUB_URL} target="_blank" rel="noreferrer">
            Return to ToolStack hub
          </a>
        </div>
      </div>
    </div>
  );
}

function IssueGroup({ title, items, onUpdate, onDelete, muted = false }) {
  if (!items?.length) return null;

  return (
    <div className={`rounded-2xl border border-neutral-200 ${muted ? "bg-white" : "bg-neutral-50"} p-3`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-2 space-y-2">
        {items.map((x) => (
          <div key={x.id} className="rounded-xl bg-white border border-neutral-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{x.title}</div>
                <div className="text-sm text-neutral-600">
                  {x.room ? `${x.room} • ` : ""}
                  <span className={`text-xs px-2 py-1 rounded-full border ${badge[x.status] || badge.open}`}>
                    {x.status}
                  </span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full border ${badge[x.severity] || badge.medium}`}>
                    {x.severity}
                  </span>
                </div>
                {x.details ? (
                  <div className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap">{x.details}</div>
                ) : null}
                {x.evidenceRef ? (
                  <div className="mt-1 text-sm text-neutral-600">Evidence: {x.evidenceRef}</div>
                ) : null}
              </div>

              <div className="flex flex-col items-end gap-2">
                <button
                  className="print:hidden px-3 py-1.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50"
                  onClick={() => onDelete(x.id)}
                >
                  Delete
                </button>
                <select
                  className="text-sm px-2 py-1 rounded-xl border border-neutral-200 bg-white"
                  value={x.status}
                  onChange={(e) => onUpdate(x.id, { status: e.target.value })}
                >
                  <option value="open">open</option>
                  <option value="progress">progress</option>
                  <option value="resolved">resolved</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
