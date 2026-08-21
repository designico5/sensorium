/**
 * SENSORIUM V2 — Quantum Instinct Matrix
 * Blueprint §5.2: AI Intuition Grid — learned pattern visualization
 * Shows confidence scores, pattern clusters, and instinct evolution
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface InstinctCell {
  id: string;
  label: string;
  category: 'harmony' | 'rhythm' | 'dynamics' | 'spatial' | 'timbre' | 'structure';
  confidence: number;  // 0..1
  activations: number;
  lastTriggered: number; // timestamp
  trend: 'rising' | 'stable' | 'declining';
  color: string;
}

/* ═══════════════════════════════════════════════════════════════════
   Category Definitions
   ═══════════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { id: 'harmony' as const, label: 'Harmony', color: '#af52de', icon: '♫' },
  { id: 'rhythm' as const, label: 'Rhythm', color: '#ff2d55', icon: '⊕' },
  { id: 'dynamics' as const, label: 'Dynamics', color: '#ff9f0a', icon: '◐' },
  { id: 'spatial' as const, label: 'Spatial', color: '#5ac8fa', icon: '◎' },
  { id: 'timbre' as const, label: 'Timbre', color: '#30d158', icon: '◈' },
  { id: 'structure' as const, label: 'Structure', color: '#ffd60a', icon: '▦' },
];

/* ═══════════════════════════════════════════════════════════════════
   Simulated Instinct Data
   ═══════════════════════════════════════════════════════════════════ */

const INSTINCTS: InstinctCell[] = [
  { id: 'i1', label: 'Minor 7th Resolution', category: 'harmony', confidence: 0.92, activations: 1247, lastTriggered: Date.now() - 30000, trend: 'rising', color: '#af52de' },
  { id: 'i2', label: 'Syncopated Kick', category: 'rhythm', confidence: 0.87, activations: 892, lastTriggered: Date.now() - 5000, trend: 'stable', color: '#ff2d55' },
  { id: 'i3', label: 'Crescendo Detection', category: 'dynamics', confidence: 0.78, activations: 456, lastTriggered: Date.now() - 120000, trend: 'rising', color: '#ff9f0a' },
  { id: 'i4', label: 'Stereo Width Pref', category: 'spatial', confidence: 0.65, activations: 234, lastTriggered: Date.now() - 600000, trend: 'stable', color: '#5ac8fa' },
  { id: 'i5', label: 'Bright Pad Detect', category: 'timbre', confidence: 0.81, activations: 678, lastTriggered: Date.now() - 15000, trend: 'rising', color: '#30d158' },
  { id: 'i6', label: 'Verse-Chorus Pattern', category: 'structure', confidence: 0.73, activations: 345, lastTriggered: Date.now() - 45000, trend: 'stable', color: '#ffd60a' },
  { id: 'i7', label: 'Tritone Substitution', category: 'harmony', confidence: 0.58, activations: 123, lastTriggered: Date.now() - 900000, trend: 'declining', color: '#af52de' },
  { id: 'i8', label: 'Swing Feel 60-80%', category: 'rhythm', confidence: 0.84, activations: 567, lastTriggered: Date.now() - 8000, trend: 'stable', color: '#ff2d55' },
  { id: 'i9', label: 'Fade Pattern', category: 'dynamics', confidence: 0.69, activations: 289, lastTriggered: Date.now() - 300000, trend: 'declining', color: '#ff9f0a' },
  { id: 'i10', label: 'HRTF Elevation', category: 'spatial', confidence: 0.71, activations: 312, lastTriggered: Date.now() - 180000, trend: 'rising', color: '#5ac8fa' },
  { id: 'i11', label: 'Saturated Warmth', category: 'timbre', confidence: 0.88, activations: 801, lastTriggered: Date.now() - 20000, trend: 'rising', color: '#30d158' },
  { id: 'i12', label: 'Build-Up Tension', category: 'structure', confidence: 0.76, activations: 445, lastTriggered: Date.now() - 60000, trend: 'stable', color: '#ffd60a' },
  { id: 'i13', label: 'Modal Mixture', category: 'harmony', confidence: 0.62, activations: 198, lastTriggered: Date.now() - 500000, trend: 'stable', color: '#af52de' },
  { id: 'i14', label: 'Ghost Note Pattern', category: 'rhythm', confidence: 0.79, activations: 534, lastTriggered: Date.now() - 10000, trend: 'rising', color: '#ff2d55' },
  { id: 'i15', label: 'Sidechain Pulse', category: 'dynamics', confidence: 0.91, activations: 1102, lastTriggered: Date.now() - 3000, trend: 'rising', color: '#ff9f0a' },
  { id: 'i16', label: 'Depth Layering', category: 'spatial', confidence: 0.67, activations: 267, lastTriggered: Date.now() - 250000, trend: 'stable', color: '#5ac8fa' },
  { id: 'i17', label: 'Formant Shift', category: 'timbre', confidence: 0.54, activations: 89, lastTriggered: Date.now() - 1200000, trend: 'declining', color: '#30d158' },
  { id: 'i18', label: 'Drop Timing', category: 'structure', confidence: 0.83, activations: 723, lastTriggered: Date.now() - 25000, trend: 'rising', color: '#ffd60a' },
];

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

/* ── Instinct Cell ─────────────────────────────────────────────── */
function InstinctGridCell({
  cell,
  isSelected,
  onClick,
}: {
  cell: InstinctCell;
  isSelected: boolean;
  onClick: () => void;
}) {
  const timeAgo = formatTimeAgo(cell.lastTriggered);

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      layout
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: isSelected
          ? `linear-gradient(135deg, ${cell.color}15, ${cell.color}08)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isSelected ? `${cell.color}40` : 'var(--border-subtle)'}`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Confidence bar background */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${cell.confidence * 100}%`,
        background: `linear-gradient(to top, ${cell.color}08, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        position: 'relative',
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}>
          {cell.label}
        </span>
        {/* Trend indicator */}
        <span style={{
          fontSize: 8,
          color: cell.trend === 'rising' ? 'var(--neon-success)' :
                 cell.trend === 'declining' ? 'var(--neon-danger)' :
                 'var(--text-tertiary)',
        }}>
          {cell.trend === 'rising' ? '▲' : cell.trend === 'declining' ? '▼' : '●'}
        </span>
      </div>

      {/* Confidence */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        position: 'relative',
      }}>
        <div style={{
          flex: 1,
          height: 3,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${cell.confidence * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: cell.color,
              borderRadius: 2,
              boxShadow: `0 0 4px ${cell.color}40`,
            }}
          />
        </div>
        <span style={{
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          color: cell.color,
          fontWeight: 700,
          minWidth: 32,
          textAlign: 'right',
        }}>
          {Math.round(cell.confidence * 100)}%
        </span>
      </div>

      {/* Meta */}
      <div style={{
        display: 'flex',
        gap: 8,
        fontSize: 8,
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-mono)',
        position: 'relative',
      }}>
        <span>{cell.activations}× act</span>
        <span>{timeAgo}</span>
      </div>
    </motion.div>
  );
}

/* ── Category Filter ───────────────────────────────────────────── */
function CategoryFilter({
  categories,
  activeFilter,
  onFilter,
}: {
  categories: typeof CATEGORIES;
  activeFilter: string | null;
  onFilter: (id: string | null) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <motion.button
        onClick={() => onFilter(null)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        style={{
          padding: '3px 8px',
          borderRadius: 'var(--radius-full)',
          background: activeFilter === null ? 'rgba(255,255,255,0.1)' : 'transparent',
          border: `1px solid ${activeFilter === null ? 'rgba(255,255,255,0.2)' : 'var(--border-subtle)'}`,
          color: activeFilter === null ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontSize: 9,
          fontWeight: activeFilter === null ? 600 : 400,
          cursor: 'pointer',
        }}
      >
        All
      </motion.button>
      {categories.map((cat) => (
        <motion.button
          key={cat.id}
          onClick={() => onFilter(activeFilter === cat.id ? null : cat.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          style={{
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            background: activeFilter === cat.id ? `${cat.color}20` : 'transparent',
            border: `1px solid ${activeFilter === cat.id ? `${cat.color}40` : 'var(--border-subtle)'}`,
            color: activeFilter === cat.id ? cat.color : 'var(--text-tertiary)',
            fontSize: 9,
            fontWeight: activeFilter === cat.id ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <span style={{ fontSize: 10 }}>{cat.icon}</span>
          {cat.label}
        </motion.button>
      ))}
    </div>
  );
}

/* ── Stats Summary ─────────────────────────────────────────────── */
function MatrixStats({ instincts }: { instincts: InstinctCell[] }) {
  const stats = useMemo(() => {
    const avgConfidence = instincts.reduce((sum, i) => sum + i.confidence, 0) / instincts.length;
    const totalActivations = instincts.reduce((sum, i) => sum + i.activations, 0);
    const rising = instincts.filter((i) => i.trend === 'rising').length;
    const highConf = instincts.filter((i) => i.confidence >= 0.8).length;
    return { avgConfidence, totalActivations, rising, highConf };
  }, [instincts]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
    }}>
      {[
        { label: 'Avg Confidence', value: `${Math.round(stats.avgConfidence * 100)}%`, color: 'var(--neon-treble)' },
        { label: 'Total Activations', value: stats.totalActivations.toLocaleString(), color: 'var(--neon-mid)' },
        { label: 'Rising', value: stats.rising.toString(), color: 'var(--neon-success)' },
        { label: 'High Conf (≥80%)', value: stats.highConf.toString(), color: 'var(--neon-bass)' },
      ].map((stat) => (
        <div key={stat.label} style={{
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: stat.color,
          }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: 8,
            color: 'var(--text-tertiary)',
            marginTop: 2,
          }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Time Ago Helper ───────────────────────────────────────────── */
function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

/* ═══════════════════════════════════════════════════════════════════
   Main QuantumInstinctMatrix Component
   ═══════════════════════════════════════════════════════════════════ */

export default function QuantumInstinctMatrix() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredInstincts = useMemo(() => {
    if (!activeFilter) return INSTINCTS;
    return INSTINCTS.filter((i) => i.category === activeFilter);
  }, [activeFilter]);

  const selectedInstinct = INSTINCTS.find((i) => i.id === selectedId);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-lg)',
      overflow: 'auto',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}>
            Quantum Instinct Matrix
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            marginTop: 2,
          }}>
            {INSTINCTS.length} patterns · AI confidence scoring
          </div>
        </div>
        <div style={{
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(175,82,222,0.1)',
          border: '1px solid rgba(175,82,222,0.2)',
          color: 'var(--neon-mid)',
          fontSize: 9,
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
        }}>
          LEARNING
        </div>
      </div>

      {/* Stats */}
      <MatrixStats instincts={INSTINCTS} />

      {/* Category Filter */}
      <CategoryFilter
        categories={CATEGORIES}
        activeFilter={activeFilter}
        onFilter={setActiveFilter}
      />

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180, 1fr))',
        gap: 8,
      }}>
        <AnimatePresence mode="popLayout">
          {filteredInstincts.map((cell) => (
            <InstinctGridCell
              key={cell.id}
              cell={cell}
              isSelected={selectedId === cell.id}
              onClick={() => setSelectedId(selectedId === cell.id ? null : cell.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Selected detail */}
      <AnimatePresence>
        {selectedInstinct && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              overflow: 'hidden',
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: `${selectedInstinct.color}08`,
              border: `1px solid ${selectedInstinct.color}20`,
            }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: `${selectedInstinct.color}15`,
                border: `1px solid ${selectedInstinct.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}>
                {CATEGORIES.find((c) => c.id === selectedInstinct.category)?.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedInstinct.label}
                </div>
                <div style={{
                  fontSize: 9,
                  color: 'var(--text-tertiary)',
                  marginTop: 4,
                  display: 'flex',
                  gap: 12,
                }}>
                  <span>Category: {selectedInstinct.category}</span>
                  <span>Confidence: {Math.round(selectedInstinct.confidence * 100)}%</span>
                  <span>Activations: {selectedInstinct.activations}×</span>
                  <span>Trend: {selectedInstinct.trend}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
