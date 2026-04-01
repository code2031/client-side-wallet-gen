'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateWallet } from '@/lib/generators';
import { coins } from '@/lib/coins';
import type { WalletResult, CoinDefinition } from '@/lib/types';

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

      {/* ── Security Notice ── */}
      <div className="bg-amber-500/[0.04] border-b border-amber-500/[0.08]">
        <p className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2 text-amber-300/70 text-[11px] sm:text-xs">
          Keys generated via <code className="font-mono text-amber-300/50 bg-amber-500/[0.06] px-1 rounded">crypto.getRandomValues</code>.
          For cold storage, disconnect from the internet before generating.
        </p>
      </div>

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
}: {
  coin: CoinDefinition;
  wallet: WalletResult | undefined;
  isRevealed: boolean;
  copiedId: string | null;
  onGenerate: () => void;
  onCopy: (text: string, id: string) => void;
  onToggleReveal: () => void;
  onExpandQR: (v: { coinId: string; field: 'addr' | 'key' }) => void;
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

          {/* Note */}
          {wallet.note && (
            <div className="bg-amber-500/[0.05] border border-amber-500/[0.1] rounded-lg p-2.5">
              <p className="text-[10px] text-amber-400/70 leading-relaxed">
                {wallet.note}
              </p>
            </div>
          )}

          {/* Regenerate */}
          <button
            onClick={onGenerate}
            className="w-full flex items-center justify-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.08] text-zinc-600 hover:text-zinc-300 rounded-xl py-2 text-[11px] font-medium transition-all"
          >
            <RefreshIcon />
            Regenerate
          </button>
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
