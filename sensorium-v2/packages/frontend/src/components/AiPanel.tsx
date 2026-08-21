/**
 * SENSORIUM V2 — AI Co-Pilot Panel
 * Conversational AI assistant for mixing, sound design, and arrangement.
 * Fluid glass morphism with spring animations.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAiStore } from '../store';
import { RippleButton, Tooltip, ContextMenu, useContextMenu } from '../lib/interactions';
import { notify, StatusIndicator } from '../lib/joyFeatures';
import type { AiMessage } from '../store';

/* ── Message Bubble (with right-click copy) ────────────────────── */
function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === 'user';
  const { anchor, onContextMenu, close } = useContextMenu();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8,
      }}
      onContextMenu={onContextMenu}
    >
      <motion.div
        whileHover={{ scale: 1.01 }}
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          background: isUser
            ? 'linear-gradient(135deg, rgba(90,200,250,0.15), rgba(90,200,250,0.08))'
            : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isUser ? 'rgba(90,200,250,0.2)' : 'var(--border-subtle)'}`,
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--text-primary)',
        }}
      >
        {message.content}
        <div style={{
          fontSize: 8,
          color: 'var(--text-tertiary)',
          marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
          fontFamily: 'var(--font-mono)',
        }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </motion.div>
      <ContextMenu
        items={[
          { label: '📋 Copy text', onClick: () => { navigator.clipboard.writeText(message.content); notify('Message copied', 'success', 1000); } },
          { label: '🔍 Ask follow-up', onClick: () => notify('Type your follow-up below', 'info', 1500) },
        ]}
        anchor={anchor}
        onClose={close}
      />
    </motion.div>
  );
}

/* ── Thinking Indicator ────────────────────────────────────────── */
function ThinkingDots() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', gap: 4, padding: '8px 12px' }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--neon-treble)',
          }}
        />
      ))}
    </motion.div>
  );
}

/* ── Quick Action Button (with Ripple + Tooltip) ──────────────── */
function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip text={label} position="top">
      <RippleButton
        onClick={onClick}
        color="var(--neon-treble)"
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          fontSize: 10,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </RippleButton>
    </Tooltip>
  );
}

/* ── Main AI Panel ─────────────────────────────────────────────── */
export default function AiPanel() {
  const messages = useAiStore((s) => s.messages);
  const isThinking = useAiStore((s) => s.isThinking);
  const sendMessage = useAiStore((s) => s.sendMessage);
  const addResponse = useAiStore((s) => s.addResponse);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    sendMessage(input.trim());
    setInput('');

    // Simulate AI response (replace with actual Tauri IPC call)
    setTimeout(() => {
      const responses = [
        'Based on the current mix, I\'d suggest adding a high-pass filter at 80Hz on the pad channel to reduce muddiness. The frequency analysis shows overlap with the bass range.',
        'The arrangement could benefit from a breakdown at bar 33. Try muting the drums and introducing a filtered sweep before the drop.',
        'For tighter low-end, sidechain the bass to the kick with a 15ms attack and 80ms release. This will create that pumping effect while keeping the mix clean.',
        'The MIDI pattern on track 1 has some velocity inconsistencies. I can quantize the velocities to a humanized groove template if you\'d like.',
        'Consider adding a subtle reverb tail (1.2s decay, 30% mix) on the snare to give it more space. The current dry signal feels cramped in the context.',
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      addResponse(response);
    }, 1200 + Math.random() * 800);
  };

  const quickActions = [
    'Analyze mix balance',
    'Suggest arrangement',
    'Optimize EQ',
    'Humanize MIDI',
    'Master chain tips',
  ];

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="glass-elevated"
      style={{
        width: 320,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'conic-gradient(var(--neon-bass), var(--neon-mid), var(--neon-treble), var(--neon-bass))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--surface-0)' }} />
        </motion.div>
        <StatusIndicator status={isThinking ? 'armed' : 'safe'} size="sm" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 0.5 }}>
          AI Co-Pilot
        </span>
        <div style={{ flex: 1 }} />
        {isThinking && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ fontSize: 9, color: 'var(--neon-treble)', fontFamily: 'var(--font-mono)' }}
          >
            thinking...
          </motion.span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 12px 8px',
        }}
      >
        <AnimatePresence>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        {isThinking && <ThinkingDots />}
      </div>

      {/* Quick Actions */}
      <div style={{
        padding: '6px 12px',
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        {quickActions.map((action) => (
          <QuickAction
            key={action}
            label={action}
            onClick={() => {
              sendMessage(action);
              setTimeout(() => {
                addResponse(`Analyzing your session for "${action}"... The current mix shows good separation in the mid-range. I recommend focusing on the low-end clarity and stereo width of the pad elements.`);
              }, 1000);
            }}
          />
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '8px 12px 12px',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about mixing, arrangement, sound design..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 12,
              outline: 'none',
            }}
            aria-label="AI chat input"
          />
          <Tooltip text="Send message (Enter)" position="left">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: input.trim() ? 'var(--neon-treble)' : 'rgba(255,255,255,0.06)',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: input.trim() ? '#000' : 'var(--text-tertiary)',
              }}
              aria-label="Send message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </motion.button>
          </Tooltip>
        </div>
      </div>
    </motion.div>
  );
}
