'use client';

import { useState, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateWallet } from '@/lib/generators';
import { coins } from '@/lib/coins';
import type { WalletResult, CoinDefinition } from '@/lib/types';

export default function WalletGenerator() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [wallets, setWallets] = useState<Record<string, WalletResult>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedQR, setExpandedQR] = useState<{ coinId: string; field: 'addr' | 'key' } | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(coins.map(c => c.category));
    return ['All', ...Array.from(cats).sort()];
  }, []);

  const filteredCoins = useMemo(() => {
    return coins.filter(c => {
      const matchesCategory = category === 'All' || c.category === category;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

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
  }, [filteredCoins]);

  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const toggleReveal = useCallback((id: string) => {
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Crypto Wallet Generator
          </h1>
          <p className="text-zinc-500 mt-1.5 text-sm">
            Client-side key generation for {coins.length} cryptocurrencies.
            Nothing leaves your browser.
          </p>
        </div>
      </header>

      {/* Security banner */}
      <div className="bg-amber-950/40 border-b border-amber-900/30 px-4 sm:px-6 lg:px-8 py-2.5">
        <p className="text-amber-200/90 text-xs max-w-[1600px] mx-auto">
          <span className="font-semibold">Security notice:</span> Keys are
          generated using your browser&apos;s cryptographic RNG (
          <code className="text-amber-300/80">crypto.getRandomValues</code>).
          For cold storage, disconnect from the internet before generating.
        </p>
      </div>

      {/* Toolbar */}
      <div className="border-b border-zinc-800/60 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-[1600px] mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Search by name or symbol..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 flex-1 min-w-0"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={generateAllVisible}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition-colors"
            >
              Generate All ({filteredCoins.length})
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  category === cat
                    ? 'bg-white text-zinc-900'
                    : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {filteredCoins.map(coin => (
            <CoinCard
              key={coin.id}
              coin={coin}
              wallet={wallets[coin.id]}
              isRevealed={!!revealed[coin.id]}
              copiedId={copied}
              expandedQR={expandedQR}
              onGenerate={() => generate(coin)}
              onCopy={copy}
              onToggleReveal={() => toggleReveal(coin.id)}
              onExpandQR={setExpandedQR}
            />
          ))}
        </div>
        {filteredCoins.length === 0 && (
          <p className="text-center text-zinc-600 py-16 text-sm">
            No coins match your search.
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 px-4 sm:px-6 lg:px-8 py-5">
        <p className="text-zinc-700 text-[11px] text-center max-w-[1600px] mx-auto">
          Never share your private keys. Wallets are generated entirely in your
          browser and are not stored or transmitted.
        </p>
      </footer>

      {/* QR Modal */}
      {expandedQR && wallets[expandedQR.coinId] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedQR(null)}
        >
          <div
            className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-zinc-400">
                {expandedQR.field === 'addr' ? 'Address' : 'Private Key'} QR
              </span>
              <button
                onClick={() => setExpandedQR(null)}
                className="text-zinc-500 hover:text-white text-lg leading-none"
              >
                x
              </button>
            </div>
            <div className="flex justify-center bg-white rounded-xl p-4">
              <QRCodeSVG
                value={
                  expandedQR.field === 'addr'
                    ? wallets[expandedQR.coinId].address
                    : wallets[expandedQR.coinId].privateKey
                }
                size={280}
                level="M"
              />
            </div>
            <p className="text-[10px] text-zinc-600 mt-3 break-all text-center">
              {expandedQR.field === 'addr'
                ? wallets[expandedQR.coinId].address
                : wallets[expandedQR.coinId].privateKey}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Individual coin card ──

function CoinCard({
  coin,
  wallet,
  isRevealed,
  copiedId,
  expandedQR,
  onGenerate,
  onCopy,
  onToggleReveal,
  onExpandQR,
}: {
  coin: CoinDefinition;
  wallet: WalletResult | undefined;
  isRevealed: boolean;
  copiedId: string | null;
  expandedQR: { coinId: string; field: 'addr' | 'key' } | null;
  onGenerate: () => void;
  onCopy: (text: string, id: string) => void;
  onToggleReveal: () => void;
  onExpandQR: (v: { coinId: string; field: 'addr' | 'key' } | null) => void;
}) {
  const bgColor =
    coin.color === '#000000' || coin.color === '#1C1C1C' || coin.color === '#1B1B1B'
      ? '#333333'
      : coin.color;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[10px]"
          style={{ backgroundColor: bgColor }}
        >
          {coin.symbol.slice(0, 3)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-white truncate leading-tight">
            {coin.name}
          </h3>
          <p className="text-zinc-600 text-xs">{coin.symbol}</p>
        </div>
        <span className="text-[9px] text-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 rounded shrink-0">
          {coin.category}
        </span>
      </div>

      {coin.parentChain && (
        <p className="text-[10px] text-zinc-700 mb-2 -mt-1">
          Uses {coin.parentChain} address
        </p>
      )}

      {!wallet ? (
        <button
          onClick={onGenerate}
          className="w-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-750 text-zinc-300 rounded-lg py-2 text-sm font-medium transition-colors mt-auto"
        >
          Generate Wallet
        </button>
      ) : (
        <div className="space-y-2.5 mt-auto">
          {/* Address */}
          <FieldBlock
            label="Address"
            value={wallet.address}
            color="text-emerald-400"
            coinId={coin.id}
            field="addr"
            copiedId={copiedId}
            onCopy={onCopy}
            onExpandQR={onExpandQR}
          />

          {/* Private Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                Private Key
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={onToggleReveal}
                  className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  {isRevealed ? 'Hide' : 'Show'}
                </button>
                <span className="text-zinc-800">|</span>
                <button
                  onClick={() => onCopy(wallet.privateKey, coin.id + '-key')}
                  className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  {copiedId === coin.id + '-key' ? 'Copied!' : 'Copy'}
                </button>
                {isRevealed && (
                  <>
                    <span className="text-zinc-800">|</span>
                    <button
                      onClick={() =>
                        onExpandQR({ coinId: coin.id, field: 'key' })
                      }
                      className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      QR
                    </button>
                  </>
                )}
              </div>
            </div>
            {isRevealed ? (
              <code className="text-[10px] text-red-400/90 break-all block bg-zinc-950 rounded p-2 leading-relaxed font-mono">
                {wallet.privateKey}
              </code>
            ) : (
              <div className="bg-zinc-950 rounded p-2 text-zinc-700 text-[10px]">
                Click &ldquo;Show&rdquo; to reveal
              </div>
            )}
          </div>

          {/* Note */}
          {wallet.note && (
            <p className="text-[10px] text-amber-400/70 bg-amber-950/20 rounded p-1.5 leading-relaxed">
              {wallet.note}
            </p>
          )}

          {/* Regenerate */}
          <button
            onClick={onGenerate}
            className="w-full bg-zinc-800/60 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-lg py-1.5 text-[11px] font-medium transition-colors"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

function FieldBlock({
  label,
  value,
  color,
  coinId,
  field,
  copiedId,
  onCopy,
  onExpandQR,
}: {
  label: string;
  value: string;
  color: string;
  coinId: string;
  field: 'addr' | 'key';
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onExpandQR: (v: { coinId: string; field: 'addr' | 'key' } | null) => void;
}) {
  const copyId = coinId + '-' + field;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
          {label}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onCopy(value, copyId)}
            className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {copiedId === copyId ? 'Copied!' : 'Copy'}
          </button>
          <span className="text-zinc-800">|</span>
          <button
            onClick={() => onExpandQR({ coinId, field })}
            className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            QR
          </button>
        </div>
      </div>
      <code
        className={`text-[10px] ${color} break-all block bg-zinc-950 rounded p-2 leading-relaxed font-mono`}
      >
        {value}
      </code>
    </div>
  );
}
