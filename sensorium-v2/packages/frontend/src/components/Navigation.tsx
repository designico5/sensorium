/**
 * SENSORIUM V2 — Navigation Sidebar
 * Glass morphism sidebar with magnetic hover, scroll tooltips,
 * spring-animated active indicator, ripple clicks.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUiStore, useAiStore } from '../store';
import type { ViewMode } from '../store';
import { Tooltip, RippleButton } from '../lib/interactions';

interface NavItem {
  id: ViewMode;
  label: string;
  icon: JSX.Element;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'session',
    label: 'Session Grid',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="4" height="4" rx="0.5" />
        <rect x="7" y="1" width="4" height="4" rx="0.5" />
        <rect x="13" y="1" width="4" height="4" rx="0.5" />
        <rect x="1" y="7" width="4" height="4" rx="0.5" />
        <rect x="7" y="7" width="4" height="4" rx="0.5" />
        <rect x="13" y="7" width="4" height="4" rx="0.5" />
        <rect x="1" y="13" width="4" height="4" rx="0.5" />
        <rect x="7" y="13" width="4" height="4" rx="0.5" />
        <rect x="13" y="13" width="4" height="4" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'mixer',
    label: 'Mixer Console',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="3" y1="2" x2="3" y2="16" />
        <line x1="7" y1="2" x2="7" y2="16" />
        <line x1="11" y1="2" x2="11" y2="16" />
        <line x1="15" y1="2" x2="15" y2="16" />
        <circle cx="3" cy="6" r="1.5" fill="currentColor" />
        <circle cx="7" cy="10" r="1.5" fill="currentColor" />
        <circle cx="11" cy="4" r="1.5" fill="currentColor" />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'visual',
    label: 'Frequency Cloud',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="7" />
        <circle cx="9" cy="9" r="3" />
        <line x1="9" y1="2" x2="9" y2="4" />
        <line x1="9" y1="14" x2="9" y2="16" />
      </svg>
    ),
  },
  {
    id: 'mindmap',
    label: 'Spatial Mindmap',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="4" cy="4" r="2" />
        <circle cx="14" cy="4" r="2" />
        <circle cx="9" cy="14" r="2" />
        <line x1="4" y1="6" x2="9" y2="12" />
        <line x1="14" y1="6" x2="9" y2="12" />
        <line x1="6" y1="4" x2="12" y2="4" />
      </svg>
    ),
  },
  {
    id: 'acoustic',
    label: 'Acoustic Lab',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 9C3 5 5 13 7 9C9 5 11 13 13 9C15 5 17 13 17 9" />
      </svg>
    ),
  },
  {
    id: 'stadium',
    label: '5D Stadium',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="7" />
        <ellipse cx="9" cy="9" rx="7" ry="3" />
        <ellipse cx="9" cy="9" rx="3" ry="7" />
      </svg>
    ),
  },
  {
    id: 'instinct',
    label: 'Quantum AI',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="11" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="11" width="5" height="5" rx="1" />
        <rect x="11" y="11" width="5" height="5" rx="1" />
        <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'hardware',
    label: 'Hardware Audit',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="14" height="10" rx="1.5" />
        <line x1="5" y1="7" x2="5" y2="9" />
        <line x1="8" y1="6" x2="8" y2="10" />
        <line x1="11" y1="7" x2="11" y2="9" />
        <line x1="14" y1="8" x2="14" y2="8" />
        <line x1="2" y1="15" x2="16" y2="15" />
      </svg>
    ),
  },
  {
    id: 'production',
    label: 'Production Suite',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="7" />
        <path d="M9 5V9L12 11" />
        <circle cx="9" cy="9" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'arrangement',
    label: 'Arrangement',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="2" width="8" height="3" rx="0.5" />
        <rect x="11" y="2" width="6" height="3" rx="0.5" />
        <rect x="1" y="7" width="5" height="3" rx="0.5" />
        <rect x="8" y="7" width="9" height="3" rx="0.5" />
        <rect x="1" y="12" width="10" height="3" rx="0.5" />
        <rect x="13" y="12" width="4" height="3" rx="0.5" />
      </svg>
    ),
  },
];

export default function Navigation() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const showVisualizer = useUiStore((s) => s.showVisualizer);
  const toggleVisualizer = useUiStore((s) => s.toggleVisualizer);
  const toggleAiPanel = useAiStore((s) => s.toggle);
  const isAiOpen = useAiStore((s) => s.isOpen);
  const [hoveredItem, setHoveredItem] = useState<ViewMode | null>(null);

  return (
    <motion.nav
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="glass-elevated"
      aria-label="Main navigation"
      style={{
        width: 52,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px 0',
        gap: 2,
        borderRadius: 'var(--radius-lg)',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, var(--neon-bass), var(--neon-mid), var(--neon-treble), var(--neon-bass))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--surface-0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 900,
          color: 'var(--text-primary)',
        }}>
          S
        </div>
      </motion.div>

      {/* View Mode Buttons with Tooltip + Magnetic + Ripple */}
      {NAV_ITEMS.map((item) => {
        const isActive = viewMode === item.id;
        const isHovered = hoveredItem === item.id;
        return (
          <Tooltip key={item.id} text={item.label} position="right">
            <motion.div
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              style={{ position: 'relative' }}
            >
              <RippleButton
                onClick={() => setViewMode(item.id)}
                color={isActive ? 'var(--neon-treble)' : 'rgba(255,255,255,0.15)'}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  background: isActive ? 'rgba(255,255,255,0.08)' : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                  border: 'none',
                  color: isActive ? 'var(--neon-treble)' : isHovered ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {item.icon}
                <span style={{ fontSize: 7, fontWeight: isActive ? 700 : 400, letterSpacing: 0.5 }}>
                  {item.label}
                </span>
              </RippleButton>

              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  style={{
                    position: 'absolute',
                    left: -2,
                    top: '20%',
                    bottom: '20%',
                    width: 3,
                    borderRadius: '0 2px 2px 0',
                    background: 'var(--neon-treble)',
                    boxShadow: '0 0 8px var(--neon-treble)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.div>
          </Tooltip>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Visualizer Toggle */}
      <Tooltip text={showVisualizer ? 'Visualizer ON' : 'Visualizer OFF'} position="right">
        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
          <RippleButton
            onClick={toggleVisualizer}
            color={showVisualizer ? 'rgba(90,200,250,0.3)' : 'rgba(255,255,255,0.15)'}
            aria-label="Toggle visualizer"
            aria-pressed={showVisualizer}
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: showVisualizer ? 'rgba(90,200,250,0.1)' : 'transparent',
              border: 'none',
              color: showVisualizer ? 'var(--neon-treble)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 9C1 9 4 3 9 3C14 3 17 9 17 9C17 9 14 15 9 15C4 15 1 9 1 9Z" />
              <AnimatePresence>
                {showVisualizer && <motion.circle cx="9" cy="9" r="2" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} />}
              </AnimatePresence>
            </svg>
          </RippleButton>
        </motion.div>
      </Tooltip>

      {/* AI Toggle */}
      <Tooltip text={isAiOpen ? 'AI Co-Pilot ON' : 'AI Co-Pilot OFF'} position="right">
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          style={{ marginTop: 4 }}
        >
          <RippleButton
            onClick={toggleAiPanel}
            color={isAiOpen ? 'rgba(175,82,222,0.3)' : 'rgba(255,255,255,0.15)'}
            aria-label="Toggle AI Co-Pilot"
            aria-pressed={isAiOpen}
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isAiOpen ? 'rgba(175,82,222,0.1)' : 'transparent',
              border: 'none',
              color: isAiOpen ? 'var(--neon-mid)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="7" r="4" />
              <path d="M5 13C5 11 7 10 9 10C11 10 13 11 13 13" />
              <circle cx="7.5" cy="6.5" r="0.5" fill="currentColor" />
              <circle cx="10.5" cy="6.5" r="0.5" fill="currentColor" />
            </svg>
          </RippleButton>
        </motion.div>
      </Tooltip>
    </motion.nav>
  );
}
