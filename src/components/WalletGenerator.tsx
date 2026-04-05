'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateWallet, generateWalletFromEntropy, b58check } from '@/lib/generators';
import { coins } from '@/lib/coins';
import { splitSecret, combineShares, shareToHex, hexToShare } from '@/lib/shamir';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import type { WalletResult, CoinDefinition } from '@/lib/types';

const MODES = ['Single', 'Paper', 'Bulk', 'Brain', 'Vanity', 'Split', 'Details'] as const;
type Mode = typeof MODES[number];

const CATEGORY_COLORS: Record<string, string> = {
  'Layer 1': '#3b82f6',
  'Bitcoin Fork': '#f97316',
  'EVM Chain': '#a855f7',
  Cosmos: '#6366f1',
  DeFi: '#10b981',
  Stablecoin: '#14b8a6',
  Memecoin: '#eab308',
  Infrastructure: '#6b7280',
  Gaming: '#ec4899',
};

function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function QRIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="2" y="14" width="8" height="8" rx="1" />
      <rect x="14" y="14" width="4" height="4" rx="0.5" />
      <rect x="20" y="14" width="2" height="2" />
      <rect x="14" y="20" width="2" height="2" />
      <rect x="20" y="20" width="2" height="2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Main Component ──

export default function WalletGenerator() {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode>('Single');
  const [category, setCategory] = useState('All');
  const [wallets, setWallets] = useState<Record<string, WalletResult>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ coinId: string; field: 'addr' | 'key' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        searchRef.current?.blur();
        setQrModal(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(coins.map(c => c.category));
    return ['All', ...Array.from(cats).sort()];
  }, []);

  const filteredCoins = useMemo(() => {
    return coins.filter(c => {
      const matchesCat = category === 'All' || c.category === category;
      const q = search.toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [search, category]);

  const generatedCount = useMemo(() => Object.keys(wallets).length, [wallets]);

  const generate = useCallback((coin: CoinDefinition) => {
    const result = generateWallet(coin.generator, coin.params);
    setWallets(prev => ({ ...prev, [coin.id]: result }));
    setRevealed(prev => ({ ...prev, [coin.id]: false }));
  }, []);

  const generateAllVisible = useCallback(() => {
    const next: Record<string, WalletResult> = {};
    const rev: Record<string, boolean> = {};
    for (const coin of filteredCoins) {
      next[coin.id] = generateWallet(coin.generator, coin.params);
      rev[coin.id] = false;
    }
    setWallets(prev => ({ ...prev, ...next }));
    setRevealed(prev => ({ ...prev, ...rev }));
    showToast(`Generated ${filteredCoins.length} wallets`);
  }, [filteredCoins]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const copy = useCallback((text: string, id: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-HTTPS contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(id);
    showToast('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  }, [showToast]);

  const toggleReveal = useCallback((id: string) => {
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const [printData, setPrintData] = useState<{ coin: CoinDefinition; wallet: WalletResult } | null>(null);

  useEffect(() => {
    if (!printData) return;
    const timer = setTimeout(() => {
      window.print();
      setPrintData(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [printData]);

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100">
      {/* ── Header ── */}
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.07] via-transparent to-purple-600/[0.05]" />
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent">
                Crypto Wallet Generator
              </h1>
              <p className="text-zinc-500 mt-2 text-sm sm:text-base max-w-xl">
                Generate wallet addresses and private keys entirely in your browser.
                No servers, no tracking, no data collection.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-emerald-400/80 bg-emerald-500/[0.08] border border-emerald-500/[0.15] rounded-full px-3.5 py-1.5 shrink-0">
              <ShieldIcon />
              <span className="text-xs font-medium">Client-Side Only</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-5 text-xs text-zinc-500">
            <span><strong className="text-zinc-300 font-semibold">{coins.length}</strong> coins</span>
            <span><strong className="text-zinc-300 font-semibold">20</strong> chain types</span>
            <span><strong className="text-zinc-300 font-semibold">17</strong> address formats</span>
            {generatedCount > 0 && (
              <span><strong className="text-emerald-400 font-semibold">{generatedCount}</strong> generated</span>
            )}
          </div>
        </div>
      </header>

      {/* ── Mode Tabs ── */}
      <div className="border-b border-white/[0.06] bg-[#050508]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto py-2">
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                mode === m
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              {m === 'Single' ? 'Single Wallet' : m === 'Details' ? 'Wallet Details' : `${m} Wallet`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Security Notice ── */}
      <div className="bg-amber-500/[0.04] border-b border-amber-500/[0.08]">
        <p className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2 text-amber-300/70 text-[11px] sm:text-xs">
          Keys generated via <code className="font-mono text-amber-300/50 bg-amber-500/[0.06] px-1 rounded">crypto.getRandomValues</code>.
          For cold storage, disconnect from the internet before generating.
        </p>
      </div>

      {mode !== 'Single' && (
        <ModePanel
          mode={mode}
          coins={coins}
          copy={copy}
          copiedId={copied}
          showToast={showToast}
        />
      )}

      {mode === 'Single' && <>
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-30 bg-[#050508]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                <SearchIcon />
              </div>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search coins..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                >
                  <XIcon />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-700 bg-zinc-800/60 border border-zinc-700/50 rounded px-1.5 py-0.5 font-mono">
                  /
                </kbd>
              )}
            </div>
            {/* Generate All */}
            <button
              onClick={generateAllVisible}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shrink-0 transition-all hover:shadow-lg hover:shadow-blue-500/20"
            >
              Generate All
              <span className="hidden sm:inline"> ({filteredCoins.length})</span>
            </button>
          </div>

          {/* Category filters */}
          <div className="flex gap-1.5 flex-wrap">
            {categories.map(cat => {
              const isActive = category === cat;
              const catColor = CATEGORY_COLORS[cat] || '#666';
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-300 border border-transparent hover:border-white/[0.06]'
                  }`}
                >
                  {cat !== 'All' && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isActive ? catColor : catColor + '80' }}
                    />
                  )}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {filteredCoins.map(coin => (
            <CoinCard
              key={coin.id}
              coin={coin}
              wallet={wallets[coin.id]}
              isRevealed={!!revealed[coin.id]}
              copiedId={copied}
              onGenerate={() => generate(coin)}
              onCopy={copy}
              onToggleReveal={() => toggleReveal(coin.id)}
              onExpandQR={setQrModal}
              onPrint={() => wallets[coin.id] && setPrintData({ coin, wallet: wallets[coin.id] })}
            />
          ))}
        </div>
        {filteredCoins.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-600 text-sm">No coins match your search.</p>
            <button
              onClick={() => { setSearch(''); setCategory('All'); }}
              className="text-blue-500 text-xs mt-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      </>}

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-zinc-700 text-[11px]">
            Never share your private keys. Wallets exist only in your browser.
          </p>
          <p className="text-zinc-800 text-[10px]">
            Built with @noble/curves, @noble/hashes, @scure/base
          </p>
        </div>
      </footer>

      {/* ── QR Modal ── */}
      {qrModal && wallets[qrModal.coinId] && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setQrModal(null)}
        >
          <div
            className="bg-[#0c0c0f] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <span className="text-sm font-medium text-white">
                  {coins.find(c => c.id === qrModal.coinId)?.name}
                </span>
                <span className="text-zinc-600 text-xs ml-2">
                  {qrModal.field === 'addr' ? 'Address' : 'Private Key'}
                </span>
              </div>
              <button
                onClick={() => setQrModal(null)}
                className="text-zinc-600 hover:text-white transition-colors p-1"
              >
                <XIcon />
              </button>
            </div>
            <div className="flex justify-center bg-white rounded-xl p-5">
              <QRCodeSVG
                value={
                  qrModal.field === 'addr'
                    ? wallets[qrModal.coinId].address
                    : wallets[qrModal.coinId].privateKey
                }
                size={260}
                level="M"
              />
            </div>
            <div className="mt-4 bg-white/[0.03] rounded-lg p-3">
              <code className="text-[10px] text-zinc-500 break-all block leading-relaxed font-mono">
                {qrModal.field === 'addr'
                  ? wallets[qrModal.coinId].address
                  : wallets[qrModal.coinId].privateKey}
              </code>
            </div>
            <button
              onClick={() => {
                const val = qrModal.field === 'addr'
                  ? wallets[qrModal.coinId].address
                  : wallets[qrModal.coinId].privateKey;
                copy(val, qrModal.coinId + '-modal');
              }}
              className="w-full mt-3 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 rounded-lg py-2 text-xs font-medium transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
          <div className="bg-zinc-800 border border-zinc-700/50 text-zinc-200 text-xs font-medium px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2">
            <CheckIcon size={12} />
            {toast}
          </div>
        </div>
      )}

      {/* ── Print Overlay (visible only in @media print) ── */}
      {printData && (
        <div className="print-overlay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', fontSize: 11,
              background: printData.coin.color === '#000000' ? '#333' : printData.coin.color,
            }}>
              {printData.coin.symbol.slice(0, 3)}
            </div>
            <div>
              <h1 style={{ fontSize: 22, margin: 0 }}>{printData.coin.name} Paper Wallet</h1>
              <p style={{ color: '#666', fontSize: 13, margin: 0 }}>
                {printData.coin.symbol} &mdash; {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#888', fontWeight: 600, marginBottom: 8 }}>
              Public Address
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' as const, background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 6, padding: 10, lineHeight: 1.6 }}>
              {printData.wallet.address}
            </div>
            <div style={{ marginTop: 12, textAlign: 'center' as const }}>
              <QRCodeSVG value={printData.wallet.address} size={160} level="M" />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#888', fontWeight: 600, marginBottom: 8 }}>
              Private Key
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' as const, background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 6, padding: 10, lineHeight: 1.6 }}>
              {printData.wallet.privateKey}
            </div>
            <div style={{ marginTop: 12, textAlign: 'center' as const }}>
              <QRCodeSVG value={printData.wallet.privateKey} size={160} level="M" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 2, fontWeight: 600 }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#888', fontWeight: 600, marginBottom: 8 }}>
              Seed Phrase (12 words)
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' as const, background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 6, padding: 12, lineHeight: 2 }}>
              {printData.wallet.seedPhrase}
            </div>
          </div>

          {printData.wallet.note && (
            <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 6, padding: 10, fontSize: 11, color: '#92400e', marginBottom: 20 }}>
              {printData.wallet.note}
            </div>
          )}

          <div style={{ marginTop: 32, padding: 12, border: '2px solid #dc2626', borderRadius: 8, color: '#dc2626', fontSize: 11, fontWeight: 600, textAlign: 'center' as const }}>
            KEEP THIS SAFE &mdash; Never share your private key or seed phrase with anyone.
          </div>
          <div style={{ marginTop: 16, fontSize: 10, color: '#aaa', textAlign: 'center' as const }}>
            Generated client-side &mdash; no keys were transmitted or stored.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Coin Card ──

function CoinCard({
  coin,
  wallet,
  isRevealed,
  copiedId,
  onGenerate,
  onCopy,
  onToggleReveal,
  onExpandQR,
  onPrint,
}: {
  coin: CoinDefinition;
  wallet: WalletResult | undefined;
  isRevealed: boolean;
  copiedId: string | null;
  onGenerate: () => void;
  onCopy: (text: string, id: string) => void;
  onToggleReveal: () => void;
  onExpandQR: (v: { coinId: string; field: 'addr' | 'key' }) => void;
  onPrint: () => void;
}) {
  const bgColor =
    coin.color === '#000000' || coin.color === '#1C1C1C' || coin.color === '#1B1B1B' || coin.color === '#1E1E1E'
      ? '#2a2a2a'
      : coin.color;
  const catColor = CATEGORY_COLORS[coin.category] || '#666';

  return (
    <div className="group card-base flex flex-col">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-[10px] shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`,
          }}
        >
          {coin.symbol.slice(0, 3)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[13px] text-white truncate leading-tight">
            {coin.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-zinc-500 text-[11px] font-mono">{coin.symbol}</span>
            {coin.parentChain && (
              <span className="text-zinc-700 text-[9px]">on {coin.parentChain}</span>
            )}
          </div>
        </div>
        <div
          className="text-[9px] font-medium px-2 py-0.5 rounded-md shrink-0"
          style={{
            color: catColor,
            backgroundColor: catColor + '12',
            border: `1px solid ${catColor}20`,
          }}
        >
          {coin.category}
        </div>
      </div>

      {/* Body */}
      {!wallet ? (
        <button
          onClick={onGenerate}
          className="w-full mt-auto bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] text-zinc-400 hover:text-white rounded-xl py-2.5 text-sm font-medium transition-all"
        >
          Generate Wallet
        </button>
      ) : (
        <div className="space-y-3 mt-auto">
          {/* Address */}
          <WalletField
            label="Address"
            value={wallet.address}
            accent="emerald"
            coinId={coin.id}
            field="addr"
            copiedId={copiedId}
            onCopy={onCopy}
            onQR={() => onExpandQR({ coinId: coin.id, field: 'addr' })}
          />

          {/* Private Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
                Private Key
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleReveal}
                  className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                  title={isRevealed ? 'Hide' : 'Reveal'}
                >
                  {isRevealed ? <EyeOffIcon /> : <EyeIcon />}
                </button>
                <button
                  onClick={() => onCopy(wallet.privateKey, coin.id + '-key')}
                  className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                  title="Copy"
                >
                  {copiedId === coin.id + '-key' ? <CheckIcon /> : <CopyIcon />}
                </button>
                {isRevealed && (
                  <button
                    onClick={() => onExpandQR({ coinId: coin.id, field: 'key' })}
                    className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                    title="Show QR"
                  >
                    <QRIcon />
                  </button>
                )}
              </div>
            </div>
            {isRevealed ? (
              <code className="text-[10px] text-red-400/80 break-all block bg-red-500/[0.04] border border-red-500/[0.08] rounded-lg p-2.5 leading-relaxed font-mono">
                {wallet.privateKey}
              </code>
            ) : (
              <button
                onClick={onToggleReveal}
                className="w-full bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 text-zinc-700 text-[10px] text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Click to reveal private key...
              </button>
            )}
          </div>

          {/* Or divider */}
          <div className="flex items-center gap-3 py-0.5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-semibold">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Seed Phrase */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
                Seed Phrase
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleReveal}
                  className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                  title={isRevealed ? 'Hide' : 'Reveal'}
                >
                  {isRevealed ? <EyeOffIcon /> : <EyeIcon />}
                </button>
                <button
                  onClick={() => onCopy(wallet.seedPhrase, coin.id + '-seed')}
                  className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                  title="Copy"
                >
                  {copiedId === coin.id + '-seed' ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>
            {isRevealed ? (
              <code className="text-[10px] text-orange-400/80 break-all block bg-orange-500/[0.04] border border-orange-500/[0.08] rounded-lg p-2.5 leading-relaxed font-mono">
                {wallet.seedPhrase}
              </code>
            ) : (
              <button
                onClick={onToggleReveal}
                className="w-full bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 text-zinc-700 text-[10px] text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Click to reveal seed phrase...
              </button>
            )}
          </div>

          {/* Note */}
          {wallet.note && (
            <div className="bg-amber-500/[0.05] border border-amber-500/[0.1] rounded-lg p-2.5">
              <p className="text-[10px] text-amber-400/70 leading-relaxed">
                {wallet.note}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onPrint}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.08] text-zinc-600 hover:text-zinc-300 rounded-xl py-2 text-[11px] font-medium transition-all"
            >
              <PrintIcon />
              Print
            </button>
            <button
              onClick={onGenerate}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.08] text-zinc-600 hover:text-zinc-300 rounded-xl py-2 text-[11px] font-medium transition-all"
            >
              <RefreshIcon />
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wallet Field (Address display) ──

function WalletField({
  label,
  value,
  accent,
  coinId,
  field,
  copiedId,
  onCopy,
  onQR,
}: {
  label: string;
  value: string;
  accent: 'emerald' | 'red';
  coinId: string;
  field: 'addr' | 'key';
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onQR: () => void;
}) {
  const copyId = coinId + '-' + field;
  const accentColors = accent === 'emerald'
    ? { text: 'text-emerald-400/80', bg: 'bg-emerald-500/[0.04]', border: 'border-emerald-500/[0.08]' }
    : { text: 'text-red-400/80', bg: 'bg-red-500/[0.04]', border: 'border-red-500/[0.08]' };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCopy(value, copyId)}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
            title="Copy"
          >
            {copiedId === copyId ? <CheckIcon /> : <CopyIcon />}
          </button>
          <button
            onClick={onQR}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
            title="Show QR"
          >
            <QRIcon />
          </button>
        </div>
      </div>
      <code className={`text-[10px] ${accentColors.text} break-all block ${accentColors.bg} border ${accentColors.border} rounded-lg p-2.5 leading-relaxed font-mono`}>
        {value}
      </code>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Mode Panels (Paper, Bulk, Brain, Vanity, Split, Details)
// ══════════════════════════════════════════════════════════════════

const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 transition-all';
const btnCls = 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/20';
const labelCls = 'text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-1.5 block';
const resultBoxCls = 'text-[11px] break-all bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 leading-relaxed font-mono';

function CoinDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls + ' cursor-pointer'}>
      {coins.map(c => <option key={c.id} value={c.id} className="bg-zinc-900">{c.name} ({c.symbol})</option>)}
    </select>
  );
}

function ModePanel({ mode, coins: _coins, copy, copiedId, showToast }: {
  mode: Mode;
  coins: CoinDefinition[];
  copy: (text: string, id: string) => void;
  copiedId: string | null;
  showToast: (msg: string) => void;
}) {
  switch (mode) {
    case 'Paper': return <PaperMode copy={copy} copiedId={copiedId} showToast={showToast} />;
    case 'Bulk': return <BulkMode showToast={showToast} />;
    case 'Brain': return <BrainMode copy={copy} copiedId={copiedId} />;
    case 'Vanity': return <VanityMode copy={copy} copiedId={copiedId} showToast={showToast} />;
    case 'Split': return <SplitMode copy={copy} copiedId={copiedId} showToast={showToast} />;
    case 'Details': return <DetailsMode copy={copy} copiedId={copiedId} />;
    default: return null;
  }
}

// ── Paper Wallet ──

function PaperMode({ copy, copiedId, showToast }: { copy: (t: string, id: string) => void; copiedId: string | null; showToast: (m: string) => void }) {
  const [coinId, setCoinId] = useState(coins[0].id);
  const [count, setCount] = useState(3);
  const [results, setResults] = useState<WalletResult[]>([]);

  const generate = () => {
    const coin = coins.find(c => c.id === coinId)!;
    const ws = Array.from({ length: count }, () => generateWallet(coin.generator, coin.params));
    setResults(ws);
    showToast(`Generated ${count} wallets`);
  };

  const coin = coins.find(c => c.id === coinId)!;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Paper Wallet</h2>
      <p className="text-zinc-500 text-sm">Generate multiple wallets formatted for printing.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><label className={labelCls}>Coin</label><CoinDropdown value={coinId} onChange={setCoinId} /></div>
        <div className="w-32"><label className={labelCls}>Count</label><input type="number" min={1} max={20} value={count} onChange={e => setCount(Math.min(20, Math.max(1, +e.target.value)))} className={inputCls} /></div>
        <div className="flex items-end gap-2">
          <button onClick={generate} className={btnCls}>Generate</button>
          {results.length > 0 && <button onClick={() => window.print()} className={btnCls.replace('blue-600', 'zinc-700').replace('blue-500', 'zinc-600').replace('blue-700', 'zinc-800').replace('blue-500/20', 'transparent')}>Print</button>}
        </div>
      </div>
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((w, i) => (
              <div key={i} className="card-base space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-white">{coin.name} #{i + 1}</span>
                  <span className="text-[9px] text-zinc-600">{coin.symbol}</span>
                </div>
                <div><span className={labelCls}>Address</span><code className={resultBoxCls + ' text-emerald-400/80'}>{w.address}</code></div>
                <div><span className={labelCls}>Private Key</span><code className={resultBoxCls + ' text-red-400/80'}>{w.privateKey}</code></div>
                <div><span className={labelCls}>Seed Phrase</span><code className={resultBoxCls + ' text-orange-400/80'}>{w.seedPhrase}</code></div>
              </div>
            ))}
          </div>
          {/* Print-only version */}
          <div className="print-overlay">
            <h1 style={{ fontSize: 20, marginBottom: 20 }}>{coin.name} Paper Wallets</h1>
            {results.map((w, i) => (
              <div key={i} style={{ marginBottom: 28, pageBreakInside: 'avoid' as const, borderBottom: '1px solid #ddd', paddingBottom: 20 }}>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Wallet #{i + 1}</h3>
                <div style={{ marginBottom: 8 }}><strong style={{ fontSize: 10, color: '#888' }}>ADDRESS</strong><div style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' as const, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{w.address}</div></div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 8 }}><QRCodeSVG value={w.address} size={100} level="M" /></div>
                <div style={{ marginBottom: 8 }}><strong style={{ fontSize: 10, color: '#888' }}>PRIVATE KEY</strong><div style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' as const, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{w.privateKey}</div></div>
                <div><strong style={{ fontSize: 10, color: '#888' }}>SEED PHRASE</strong><div style={{ fontFamily: 'monospace', fontSize: 11, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{w.seedPhrase}</div></div>
              </div>
            ))}
            <div style={{ textAlign: 'center' as const, color: '#dc2626', fontWeight: 600, fontSize: 11, border: '2px solid #dc2626', padding: 10, borderRadius: 8 }}>KEEP THESE SAFE — Never share private keys or seed phrases.</div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Bulk Wallet ──

function BulkMode({ showToast }: { showToast: (m: string) => void }) {
  const [coinId, setCoinId] = useState(coins[0].id);
  const [count, setCount] = useState(10);
  const [csv, setCsv] = useState('');

  const generate = () => {
    const coin = coins.find(c => c.id === coinId)!;
    const rows = ['Index,Address,Private Key,Seed Phrase'];
    for (let i = 0; i < count; i++) {
      const w = generateWallet(coin.generator, coin.params);
      rows.push(`${i + 1},"${w.address}","${w.privateKey}","${w.seedPhrase}"`);
    }
    setCsv(rows.join('\n'));
    showToast(`Generated ${count} wallets`);
  };

  const download = () => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallets-${coinId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Bulk Wallet</h2>
      <p className="text-zinc-500 text-sm">Generate many wallets at once in CSV format.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><label className={labelCls}>Coin</label><CoinDropdown value={coinId} onChange={setCoinId} /></div>
        <div className="w-32"><label className={labelCls}>Count</label><input type="number" min={1} max={1000} value={count} onChange={e => setCount(Math.min(1000, Math.max(1, +e.target.value)))} className={inputCls} /></div>
        <div className="flex items-end"><button onClick={generate} className={btnCls}>Generate</button></div>
      </div>
      {csv && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(csv); showToast('CSV copied'); }} className="text-xs text-zinc-400 hover:text-white transition-colors">Copy CSV</button>
            <button onClick={download} className="text-xs text-zinc-400 hover:text-white transition-colors">Download CSV</button>
          </div>
          <textarea readOnly value={csv} rows={12} className={inputCls + ' font-mono text-[10px] text-zinc-400 resize-y'} />
        </div>
      )}
    </div>
  );
}

// ── Brain Wallet ──

function BrainMode({ copy, copiedId }: { copy: (t: string, id: string) => void; copiedId: string | null }) {
  const [coinId, setCoinId] = useState(coins[0].id);
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [result, setResult] = useState<WalletResult | null>(null);
  const [showPass, setShowPass] = useState(false);

  const generate = () => {
    if (passphrase.length < 12) return;
    if (passphrase !== confirm) return;
    const coin = coins.find(c => c.id === coinId)!;
    const entropy = sha256(new TextEncoder().encode(passphrase));
    setResult(generateWalletFromEntropy(coin.generator, coin.params, entropy));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Brain Wallet</h2>
      <div className="bg-red-500/[0.06] border border-red-500/[0.12] rounded-lg p-3">
        <p className="text-red-400/80 text-xs">Brain wallets are vulnerable to brute-force attacks. Use a very strong, unique passphrase (12+ characters). Never use common phrases.</p>
      </div>
      <div><label className={labelCls}>Coin</label><CoinDropdown value={coinId} onChange={setCoinId} /></div>
      <div><label className={labelCls}>Passphrase (min 12 chars)</label><input type={showPass ? 'text' : 'password'} value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="Enter a strong passphrase..." className={inputCls} /></div>
      <div><label className={labelCls}>Confirm Passphrase</label><input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter passphrase..." className={inputCls} /></div>
      <div className="flex items-center gap-3">
        <button onClick={generate} className={btnCls} disabled={passphrase.length < 12 || passphrase !== confirm}>Generate</button>
        <label className="text-xs text-zinc-500 flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} className="accent-blue-600" /> Show</label>
        {passphrase.length > 0 && passphrase.length < 12 && <span className="text-[10px] text-red-400">{12 - passphrase.length} more chars needed</span>}
        {passphrase.length >= 12 && confirm.length > 0 && passphrase !== confirm && <span className="text-[10px] text-red-400">Passphrases don&apos;t match</span>}
      </div>
      {result && (
        <div className="card-base space-y-3 mt-4">
          <div><span className={labelCls}>Address</span><code className={resultBoxCls + ' text-emerald-400/80'}>{result.address}</code></div>
          <div><span className={labelCls}>Private Key</span><code className={resultBoxCls + ' text-red-400/80'}>{result.privateKey}</code></div>
          <div><span className={labelCls}>Seed Phrase</span><code className={resultBoxCls + ' text-orange-400/80'}>{result.seedPhrase}</code></div>
          <p className="text-[10px] text-zinc-600">Deterministic: same passphrase + coin always produces the same address.</p>
        </div>
      )}
    </div>
  );
}

// ── Vanity Wallet ──

function VanityMode({ copy, copiedId, showToast }: { copy: (t: string, id: string) => void; copiedId: string | null; showToast: (m: string) => void }) {
  const [coinId, setCoinId] = useState(coins[0].id);
  const [prefix, setPrefix] = useState('');
  const [running, setRunning] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<WalletResult | null>(null);
  const cancelRef = useRef(false);

  const search = () => {
    if (!prefix) return;
    setRunning(true);
    setResult(null);
    setAttempts(0);
    cancelRef.current = false;
    const coin = coins.find(c => c.id === coinId)!;
    const target = prefix.toLowerCase();
    let count = 0;

    function batch() {
      if (cancelRef.current) { setRunning(false); return; }
      for (let i = 0; i < 200; i++) {
        const w = generateWallet(coin.generator, coin.params);
        count++;
        if (w.address.toLowerCase().includes(target)) {
          setResult(w);
          setAttempts(count);
          setRunning(false);
          showToast(`Found after ${count.toLocaleString()} attempts`);
          return;
        }
      }
      setAttempts(count);
      setTimeout(batch, 0);
    }
    batch();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Vanity Wallet</h2>
      <p className="text-zinc-500 text-sm">Search for an address containing a specific pattern. Longer patterns take exponentially longer.</p>
      <div><label className={labelCls}>Coin</label><CoinDropdown value={coinId} onChange={setCoinId} /></div>
      <div><label className={labelCls}>Address must contain</label><input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="e.g. cafe, dead, 1337" className={inputCls} maxLength={6} /></div>
      <div className="flex items-center gap-3">
        {!running ? (
          <button onClick={search} className={btnCls} disabled={!prefix}>Search</button>
        ) : (
          <button onClick={() => { cancelRef.current = true; }} className={btnCls.replace('blue', 'red')}>Stop</button>
        )}
        {(running || attempts > 0) && <span className="text-xs text-zinc-500">{attempts.toLocaleString()} attempts{running && '...'}</span>}
      </div>
      {result && (
        <div className="card-base space-y-3">
          <div><span className={labelCls}>Address</span><code className={resultBoxCls + ' text-emerald-400/80'}>{result.address}</code></div>
          <div><span className={labelCls}>Private Key</span><code className={resultBoxCls + ' text-red-400/80'}>{result.privateKey}</code></div>
          <div><span className={labelCls}>Seed Phrase</span><code className={resultBoxCls + ' text-orange-400/80'}>{result.seedPhrase}</code></div>
        </div>
      )}
    </div>
  );
}

// ── Split Wallet (Shamir's Secret Sharing) ──

function SplitMode({ copy, copiedId, showToast }: { copy: (t: string, id: string) => void; copiedId: string | null; showToast: (m: string) => void }) {
  const [tab, setTab] = useState<'split' | 'combine'>('split');
  const [coinId, setCoinId] = useState(coins[0].id);
  const [numShares, setNumShares] = useState(3);
  const [threshold, setThreshold] = useState(2);
  const [wallet, setWallet] = useState<WalletResult | null>(null);
  const [shares, setShares] = useState<string[]>([]);
  const [shareInput, setShareInput] = useState('');
  const [recovered, setRecovered] = useState<WalletResult | null>(null);

  const doSplit = () => {
    const coin = coins.find(c => c.id === coinId)!;
    const w = generateWallet(coin.generator, coin.params);
    setWallet(w);
    let keyHex = w.privateKey;
    if (keyHex.startsWith('0x')) keyHex = keyHex.slice(2);
    if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
      keyHex = bytesToHex(sha256(new TextEncoder().encode(w.privateKey)));
    }
    const secret = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
    const parts = splitSecret(secret, numShares, threshold);
    setShares(parts.map(shareToHex));
  };

  const doCombine = () => {
    const lines = shareInput.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return;
    const parts = lines.map(hexToShare);
    const secret = combineShares(parts);
    const coin = coins.find(c => c.id === coinId)!;
    setRecovered(generateWalletFromEntropy(coin.generator, coin.params, secret));
    showToast('Secret reconstructed');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Split Wallet</h2>
      <p className="text-zinc-500 text-sm">Split a private key into N shares requiring M to reconstruct (Shamir&apos;s Secret Sharing).</p>
      <div className="flex gap-2">
        <button onClick={() => setTab('split')} className={`px-4 py-1.5 rounded-lg text-xs font-medium ${tab === 'split' ? 'bg-white text-zinc-900' : 'text-zinc-500 hover:text-white bg-white/[0.04]'}`}>Split</button>
        <button onClick={() => setTab('combine')} className={`px-4 py-1.5 rounded-lg text-xs font-medium ${tab === 'combine' ? 'bg-white text-zinc-900' : 'text-zinc-500 hover:text-white bg-white/[0.04]'}`}>Combine</button>
      </div>
      <div><label className={labelCls}>Coin</label><CoinDropdown value={coinId} onChange={setCoinId} /></div>

      {tab === 'split' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-32"><label className={labelCls}>Shares (N)</label><input type="number" min={2} max={255} value={numShares} onChange={e => setNumShares(Math.max(2, +e.target.value))} className={inputCls} /></div>
            <div className="w-32"><label className={labelCls}>Threshold (M)</label><input type="number" min={2} max={numShares} value={threshold} onChange={e => setThreshold(Math.min(numShares, Math.max(2, +e.target.value)))} className={inputCls} /></div>
          </div>
          <button onClick={doSplit} className={btnCls}>Generate &amp; Split</button>
          {wallet && shares.length > 0 && (
            <div className="space-y-3">
              <div className="card-base"><span className={labelCls}>Address</span><code className={resultBoxCls + ' text-emerald-400/80'}>{wallet.address}</code></div>
              <p className="text-xs text-zinc-500">Any {threshold} of these {numShares} shares can reconstruct the key:</p>
              {shares.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600 w-14 shrink-0">Share {i + 1}</span>
                  <code className="text-[10px] text-cyan-400/80 break-all bg-white/[0.03] border border-white/[0.06] rounded p-2 flex-1 font-mono">{s}</code>
                  <button onClick={() => copy(s, 'share-' + i)} className="text-[10px] text-zinc-600 hover:text-white shrink-0">{copiedId === 'share-' + i ? 'Copied' : 'Copy'}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'combine' && (
        <div className="space-y-4">
          <div><label className={labelCls}>Shares (one hex per line)</label><textarea value={shareInput} onChange={e => setShareInput(e.target.value)} rows={5} placeholder="Paste shares here, one per line..." className={inputCls + ' font-mono text-[11px] resize-y'} /></div>
          <button onClick={doCombine} className={btnCls}>Reconstruct</button>
          {recovered && (
            <div className="card-base space-y-3">
              <div><span className={labelCls}>Recovered Address</span><code className={resultBoxCls + ' text-emerald-400/80'}>{recovered.address}</code></div>
              <div><span className={labelCls}>Recovered Key</span><code className={resultBoxCls + ' text-red-400/80'}>{recovered.privateKey}</code></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Wallet Details ──

function DetailsMode({ copy, copiedId }: { copy: (t: string, id: string) => void; copiedId: string | null }) {
  const [coinId, setCoinId] = useState(coins[0].id);
  const [keyInput, setKeyInput] = useState('');
  const [result, setResult] = useState<WalletResult | null>(null);
  const [error, setError] = useState('');

  const inspect = () => {
    setError('');
    setResult(null);
    const coin = coins.find(c => c.id === coinId)!;
    try {
      let hex = keyInput.trim();
      if (hex.startsWith('0x')) hex = hex.slice(2);
      let raw: Uint8Array;
      if (/^[0-9a-fA-F]{64}$/.test(hex)) {
        raw = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
      } else if (/^[5KLcQ][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(keyInput.trim())) {
        const decoded = b58check.decode(keyInput.trim());
        raw = decoded.length === 34 ? decoded.slice(1, 33) : decoded.slice(1);
      } else {
        setError('Enter a 64-char hex key (with or without 0x) or a WIF private key.');
        return;
      }
      setResult(generateWalletFromEntropy(coin.generator, coin.params, raw));
    } catch (e) {
      setError('Invalid key: ' + (e as Error).message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Wallet Details</h2>
      <p className="text-zinc-500 text-sm">Enter a private key to view the corresponding address and key formats.</p>
      <div><label className={labelCls}>Coin Type</label><CoinDropdown value={coinId} onChange={setCoinId} /></div>
      <div><label className={labelCls}>Private Key (hex or WIF)</label><input value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="0x... or WIF..." className={inputCls + ' font-mono'} /></div>
      <button onClick={inspect} className={btnCls} disabled={!keyInput.trim()}>View Details</button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {result && (
        <div className="card-base space-y-3">
          <div className="flex items-center gap-2"><span className={labelCls + ' mb-0 flex-shrink-0'}>Address</span><code className={resultBoxCls + ' text-emerald-400/80 flex-1'}>{result.address}</code>
            <button onClick={() => copy(result.address, 'det-a')} className="text-[10px] text-zinc-600 hover:text-white">{copiedId === 'det-a' ? 'Copied' : 'Copy'}</button></div>
          <div className="flex items-center gap-2"><span className={labelCls + ' mb-0 flex-shrink-0'}>Private Key</span><code className={resultBoxCls + ' text-red-400/80 flex-1'}>{result.privateKey}</code>
            <button onClick={() => copy(result.privateKey, 'det-k')} className="text-[10px] text-zinc-600 hover:text-white">{copiedId === 'det-k' ? 'Copied' : 'Copy'}</button></div>
          <div><span className={labelCls}>Seed Phrase</span><code className={resultBoxCls + ' text-orange-400/80'}>{result.seedPhrase}</code></div>
          {result.note && <p className="text-[10px] text-amber-400/70">{result.note}</p>}
        </div>
      )}
    </div>
  );
}
