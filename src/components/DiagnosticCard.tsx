/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DiagnosticCardData } from '../types';
import { AlertCircle, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

interface DiagnosticCardProps {
  alerts: DiagnosticCardData[];
  onAcknowledge: (id: string) => void;
  onAutoResolve: (id: string) => void;
}

export default function DiagnosticCard({ alerts, onAcknowledge, onAutoResolve }: DiagnosticCardProps) {
  const activeAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
      <AnimatePresence mode="popLayout">
        {activeAlerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-center"
          >
            <CheckCircle2 className="w-8 h-8 text-neon-green mb-2 opacity-80" />
            <h4 className="font-display font-medium text-xs text-gray-200 uppercase tracking-wider">
              All MIDI Lanes Nominal
            </h4>
            <p className="font-sans text-[11px] text-gray-400 mt-1 max-w-[200px]">
              No drift, drops or overflows detected. Standard latency is &lt; 5.2ms.
            </p>
          </motion.div>
        ) : (
          activeAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 120 }}
              className={`p-4 rounded-xl border relative overflow-hidden backdrop-blur-xl shadow-lg transition-all duration-300 ${
                alert.severity === 'Error'
                  ? 'border-neon-red/30 bg-neon-red/[0.03] shadow-neon-red/5'
                  : 'border-neon-yellow/30 bg-neon-yellow/[0.02] shadow-neon-yellow/5'
              }`}
            >
              {/* Left neon status column strip */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  alert.severity === 'Error' ? 'bg-neon-red' : 'bg-neon-yellow'
                }`}
              />

              {/* Header */}
              <div className="flex items-start gap-2.5 pl-1.5">
                {alert.severity === 'Error' ? (
                  <ShieldAlert className="w-4.5 h-4.5 text-neon-red shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 text-neon-yellow shrink-0 mt-0.5" />
                )}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] font-bold text-gray-400 uppercase">
                      Telemetry Alert
                    </span>
                    <span className="font-mono text-[8px] text-gray-500">
                      {alert.timestamp}
                    </span>
                  </div>
                  <h4 className="font-display font-semibold text-xs text-gray-100 tracking-tight mt-0.5">
                    {alert.deviceName}
                  </h4>
                </div>
              </div>

              {/* Details sections (Symptom, Cause, Action) */}
              <div className="mt-3 space-y-2.5 text-[11px] pl-1.5 border-l border-white/5 ml-2.5">
                <div>
                  <span className="text-gray-400 font-medium block">Was kaputt ist:</span>
                  <span className="text-gray-100 font-mono leading-relaxed block mt-0.5">
                    {alert.symptom}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Ursache:</span>
                  <span className="text-gray-300 block leading-relaxed mt-0.5">
                    {alert.cause}
                  </span>
                </div>
                <div>
                  <span className="text-neon-cyan font-medium block">Was jetzt tun:</span>
                  <span className="text-gray-200 font-medium block leading-relaxed mt-0.5 bg-white/[0.03] p-1.5 rounded border border-white/5">
                    {alert.action}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-3.5 pl-1.5">
                <button
                  onClick={() => onAutoResolve(alert.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/5 text-[10px] font-mono transition"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
                  Re-Test
                </button>
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-medium text-[10px] tracking-wide uppercase transition"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
