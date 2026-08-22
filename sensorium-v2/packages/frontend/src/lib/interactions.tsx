/**
 * SENSORIUM V2 — Interaction Utilities
 * Haptic-first interaction primitives: Rotary drag, magnetic hover,
 * scroll-wheel, double-click-reset, ripple, long-press, keyboard nav.
 */
import { useCallback, useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, AnimatePresence } from 'motion/react';

/* ═══════════════════════════════════════════════════════════════════
   useRotary — True rotary knob via vertical drag + scroll wheel
   Drag up = increase, drag down = decrease
   Scroll wheel = fine adjust
   Double-click = reset to default
   Shift = fine mode (0.1x sensitivity)
   ═══════════════════════════════════════════════════════════════════ */

export function useRotary({
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  sensitivity = 0.005,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  sensitivity?: number;
  onChange: (v: number) => void;
}) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);
  const [isHovered, setIsHovered] = useState(false);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const quantize = (v: number) => Math.round(v / step) * step;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [value]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dy = startY.current - e.clientY;
    const sens = e.shiftKey ? sensitivity * 0.1 : sensitivity;
    const range = max - min;
    const delta = dy * sens * range;
    const newValue = quantize(clamp(startValue.current + delta));
    onChange(newValue);
  }, [min, max, sensitivity, onChange]);

  const endDrag = useCallback((e?: React.PointerEvent) => {
    const target = e?.currentTarget as HTMLElement | undefined;
    if (e && target && target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const sens = e.shiftKey ? step * 0.1 : step;
    const delta = e.deltaY < 0 ? sens : -sens;
    onChange(quantize(clamp(value + delta)));
  }, [value, step, onChange]);

  const handleDoubleClick = useCallback(() => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  // Keyboard support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const sens = e.shiftKey ? step * 0.1 : step;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(quantize(clamp(value + sens)));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(quantize(clamp(value - sens)));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (defaultValue !== undefined) onChange(defaultValue);
    }
  }, [value, step, min, max, defaultValue, onChange]);

  return {
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
      onWheel: handleWheel,
      onDoubleClick: handleDoubleClick,
      onKeyDown: handleKeyDown,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    },
    isDragging: isDragging.current,
    isHovered,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   RotaryKnob — Visual rotary knob component
   SVG arc indicator, drag interaction, hover glow
   ═══════════════════════════════════════════════════════════════════ */

export function RotaryKnob({
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  label,
  color = 'var(--neon-treble)',
  size = 28,
  formatValue,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  label?: string;
  color?: string;
  size?: number;
  formatValue?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { handlers, isHovered } = useRotary({
    value, min, max, step, defaultValue, onChange,
  });

  const normalized = (value - min) / (max - min);
  const rotation = -135 + normalized * 270; // -135° to +135°
  const arcLength = normalized * 0.75; // 270° arc

  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;

  const displayValue = formatValue ? formatValue(value) : value.toFixed(1);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
      {...handlers}
      tabIndex={0}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={2}
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
          />
          {/* Value arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeDasharray={`${arcLength * circumference} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dasharray 0.1s ease-out',
              filter: isHovered ? `drop-shadow(0 0 3px ${color})` : 'none',
            }}
          />
          {/* Center knob */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.3}
            fill="rgba(20,20,30,0.9)"
            stroke={isHovered ? color : 'rgba(255,255,255,0.1)'}
            strokeWidth={1}
            style={{ transition: 'stroke 0.2s' }}
          />
          {/* Indicator line */}
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + Math.cos((rotation - 90) * Math.PI / 180) * (size * 0.25)}
            y2={size / 2 + Math.sin((rotation - 90) * Math.PI / 180) * (size * 0.25)}
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </div>
      {label && (
        <span style={{
          fontSize: 7,
          color: isHovered ? color : 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          transition: 'color 0.2s',
          textAlign: 'center',
          maxWidth: size * 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {displayValue}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useLongPress — Long-press gesture with haptic threshold
   ═══════════════════════════════════════════════════════════════════ */

export function useLongPress({
  onLongPress,
  onShortPress,
  threshold = 500,
}: {
  onLongPress: () => void;
  onShortPress?: () => void;
  threshold?: number;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handlePointerDown = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPress.current && onShortPress) {
      onShortPress();
    }
  }, [onShortPress]);

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   RippleButton — Button with material-design-style ripple on click
   ═══════════════════════════════════════════════════════════════════ */

export function RippleButton({
  children,
  onClick,
  color = 'rgba(255,255,255,0.3)',
  className,
  style,
  ...props
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    onClick?.(e);
  }, [onClick]);

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      {...props}
    >
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            marginLeft: -10,
            marginTop: -10,
            borderRadius: '50%',
            background: color,
            pointerEvents: 'none',
          }}
        />
      ))}
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useMagnetic — Magnetic hover effect (element pulls toward cursor)
   ═══════════════════════════════════════════════════════════════════ */

export function useMagnetic(strength = 0.3, radius = 60) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < radius) {
        const pull = (1 - dist / radius) * strength;
        x.set(distX * pull);
        y.set(distY * pull);
      } else {
        x.set(0);
        y.set(0);
      }
    };

    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [x, y, strength, radius]);

  return { ref, x, y };
}

/* ═══════════════════════════════════════════════════════════════════
   Tooltip — Hover tooltip with spring animation
   ═══════════════════════════════════════════════════════════════════ */

export function Tooltip({
  children,
  text,
  position = 'top',
}: {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const [isShown, setIsShown] = useState(false);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 },
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setIsShown(true)}
      onMouseLeave={() => setIsShown(false)}
    >
      {children}
      <AnimatePresence>
        {isShown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'absolute',
              ...positionStyles[position],
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(20,20,30,0.95)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 9,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 1000,
              backdropFilter: 'blur(8px)',
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ContextMenu — Right-click context menu with spring animation
   ═══════════════════════════════════════════════════════════════════ */

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

export function ContextMenu({
  items,
  anchor,
  onClose,
}: {
  items: ContextMenuItem[];
  anchor: { x: number; y: number } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = () => {
      onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('click', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      {anchor && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            position: 'fixed',
            left: anchor.x,
            top: anchor.y,
            minWidth: 140,
            background: 'rgba(18,18,28,0.96)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 0',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 8px' }} />
            ) : (
              <motion.button
                key={i}
                whileHover={{ x: 2 }}
                onClick={() => { item.onClick(); onClose(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'none',
                  color: item.danger ? 'var(--neon-danger)' : 'var(--text-primary)',
                  fontSize: 10,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {item.icon && <span style={{ width: 14, display: 'inline-flex' }}>{item.icon}</span>}
                {item.label}
              </motion.button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useContextMenu — Hook for right-click context menus
   ═══════════════════════════════════════════════════════════════════ */

export function useContextMenu() {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setAnchor({ x: e.clientX, y: e.clientY });
  }, []);

  const close = useCallback(() => setAnchor(null), []);

  return { anchor, onContextMenu, close };
}

/* ═══════════════════════════════════════════════════════════════════
   GlowPulse — Pulsing glow overlay for active elements
   ═══════════════════════════════════════════════════════════════════ */

export function GlowPulse({
  color,
  isActive,
  size = 'md',
}: {
  color: string;
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = { sm: 6, md: 12, lg: 20 };
  const blur = sizeMap[size];

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          exit={{ opacity: 0 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 'inherit',
            boxShadow: `0 0 ${blur}px ${color}60, 0 0 ${blur * 2}px ${color}30`,
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useDragDrop — Simple drag-and-drop hook with visual feedback
   ═══════════════════════════════════════════════════════════════════ */

export function useDragDrop<T extends string>({
  onDrop,
}: {
  onDrop: (dragId: T, dropId: string) => void;
}) {
  const [dragId, setDragId] = useState<T | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const makeDraggable = useCallback((id: T) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      setDragId(id);
    },
    onDragEnd: () => setDragId(null),
  }), []);

  const makeDroppable = useCallback((id: string) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverId(id);
    },
    onDragLeave: () => setOverId(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain') as T;
      if (sourceId) onDrop(sourceId, id);
      setOverId(null);
      setDragId(null);
    },
  }), [onDrop]);

  return { dragId, overId, makeDraggable, makeDroppable };
}

/* ═══════════════════════════════════════════════════════════════════
   useMultiSelect — Shift/Ctrl click multi-selection
   ═══════════════════════════════════════════════════════════════════ */

export function useMultiSelect<T>(allIds: T[]) {
  const [selected, setSelected] = useState<Set<T>>(new Set());
  const lastClicked = useRef<T | null>(null);

  const handleSelect = useCallback((id: T, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastClicked.current !== null) {
        // Range select
        const startIdx = allIds.indexOf(lastClicked.current);
        const endIdx = allIds.indexOf(id);
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        for (let i = from; i <= to; i++) next.add(allIds[i]);
      } else if (e.ctrlKey || e.metaKey) {
        // Toggle select
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        // Single select
        next.clear();
        next.add(id);
      }
      return next;
    });
    lastClicked.current = id;
  }, [allIds]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const selectAll = useCallback(() => setSelected(new Set(allIds)), [allIds]);

  return { selected, handleSelect, clearSelection, selectAll };
}
