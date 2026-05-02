import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useControlStore } from '../../store/controlStore';

const LOCK_DURATION_MS = 1000;

function getCommandTheme(type: string) {
  if (type.includes('RELEASE')) {
    return {
      accent: '#f59e0b',
      accentDim: '#451a03',
      accentBorder: '#78350f',
      icon: '📦',
    };
  }
  if (type === 'MANUAL_TAKEOVER') {
    return {
      accent: '#ef4444',
      accentDim: '#450a0a',
      accentBorder: '#7f1d1d',
      icon: '⚠',
    };
  }
  if (type === 'INITIATE_RTL') {
    return {
      accent: '#f97316',
      accentDim: '#431407',
      accentBorder: '#9a3412',
      icon: '🏠',
    };
  }
  return {
    accent: '#3b82f6',
    accentDim: '#1e3a5f',
    accentBorder: '#1e40af',
    icon: '▶',
  };
}

export const IntentOverlay: React.FC = () => {
  const isOpen = useControlStore((s) => s.isOverlayOpen);
  const pendingCommand = useControlStore((s) => s.pendingCommand);
  const confirmCommand = useControlStore((s) => s.confirmCommand);
  const cancelCommand = useControlStore((s) => s.cancelCommand);

  const [lockProgress, setLockProgress] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLockProgress(0);
      setIsUnlocked(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }

    setLockProgress(0);
    setIsUnlocked(false);

    const INTERVAL_MS = 50;
    const STEPS = LOCK_DURATION_MS / INTERVAL_MS;
    let step = 0;

    progressInterval.current = setInterval(() => {
      step++;
      const progress = Math.min(100, (step / STEPS) * 100);
      setLockProgress(progress);
      if (progress >= 100) {
        setIsUnlocked(true);
        if (progressInterval.current) clearInterval(progressInterval.current);
      }
    }, INTERVAL_MS);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) cancelCommand();
      if (e.key === 'Enter' && isOpen && isUnlocked) confirmCommand();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUnlocked, cancelCommand, confirmCommand]);

  if (!pendingCommand) return null;

  const theme = getCommandTheme(pendingCommand.type);
  const hasWarning = !!pendingCommand.warning;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={cancelCommand}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(7, 11, 20, 0.85)',
              zIndex: 9000,
            }}
          />

          <motion.div
            key="modal"
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 440,
              zIndex: 9001,
              backgroundColor: '#0d1321',
              border: `1px solid ${theme.accent}50`,
              borderRadius: 6,
              overflow: 'hidden',
              boxShadow: `0 0 40px ${theme.accent}20`,
            }}
          >
            <div style={{ height: 3, backgroundColor: theme.accent }} />

            <div style={{ padding: '20px 24px 24px' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: theme.accentDim,
                      border: `1px solid ${theme.accentBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    {theme.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 11,
                        letterSpacing: '0.15em',
                        color: '#4a6080',
                        marginBottom: 2,
                      }}
                    >
                      KOMUT ONAYI GEREKLİ
                    </div>
                    <div
                      style={{
                        fontFamily: "'Rajdhani', monospace",
                        fontSize: 20,
                        fontWeight: 700,
                        color: theme.accent,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {pendingCommand.label}
                    </div>
                  </div>
                </div>

                <button
                  onClick={cancelCommand}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4a6080',
                    padding: 4,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <p
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 14,
                  color: '#8ba3be',
                  lineHeight: 1.5,
                  marginBottom: 12,
                }}
              >
                {pendingCommand.description}
              </p>

              {hasWarning && (
                <div
                  style={{
                    backgroundColor: '#450a0a',
                    border: '1px solid #7f1d1d',
                    borderRadius: 4,
                    padding: '10px 14px',
                    marginBottom: 12,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 13,
                      color: '#fca5a5',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {pendingCommand.warning}
                  </p>
                </div>
              )}

              {pendingCommand.consequence && (
                <div
                  style={{
                    backgroundColor: theme.accentDim,
                    border: `1px solid ${theme.accentBorder}`,
                    borderRadius: 4,
                    padding: '8px 12px',
                    marginBottom: 20,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 13,
                      color: '#8ba3be',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {pendingCommand.consequence}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      color: isUnlocked ? '#10b981' : '#4a6080',
                    }}
                  >
                    {isUnlocked ? '✓ ONAY AKTİF' : 'Onay kilidi...'}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: '#4a6080',
                    }}
                  >
                    {isUnlocked ? '1.0s' : `${(lockProgress / 100).toFixed(1)}s`}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    backgroundColor: '#1e2d40',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    style={{
                      height: '100%',
                      backgroundColor: isUnlocked ? '#10b981' : theme.accent,
                      borderRadius: 2,
                    }}
                    animate={{ width: `${lockProgress}%` }}
                    transition={{ duration: 0.05, ease: 'linear' }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelCommand}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 4,
                    border: '1px solid #1e2d40',
                    backgroundColor: '#0d1321',
                    color: '#4a6080',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  İPTAL
                </button>

                <motion.button
                  onClick={isUnlocked ? confirmCommand : undefined}
                  disabled={!isUnlocked}
                  whileHover={isUnlocked ? { scale: 1.02 } : {}}
                  whileTap={isUnlocked ? { scale: 0.98 } : {}}
                  style={{
                    flex: 2,
                    padding: '10px 16px',
                    borderRadius: 4,
                    border: `1px solid ${isUnlocked ? theme.accent : '#2a4060'}`,
                    backgroundColor: isUnlocked ? theme.accentDim : '#0d1321',
                    color: isUnlocked ? theme.accent : '#2a4060',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: isUnlocked ? `0 0 12px ${theme.accent}30` : 'none',
                  }}
                >
                  {isUnlocked && <Check size={14} />}
                  {pendingCommand.confirmLabel}
                </motion.button>
              </div>

              <div
                className="flex justify-between mt-3"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: '#1e2d40',
                }}
              >
                <span>ESC = İptal</span>
                <span>ENTER = Onayla (kilit dolunca)</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

