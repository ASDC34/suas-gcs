import React, { useState } from 'react';

interface CheckItem {
  id: string;
  label: string;
  rule: string;
  critical: boolean;
  checked: boolean;
}

const CHECKLIST_ITEMS: Omit<CheckItem, 'checked'>[] = [
  {
    id: 'faa_reg',
    label: 'FAA DroneZone kaydı — sertifika yazdırıldı',
    rule: '5.3.3',
    critical: true,
  },
  {
    id: 'trust_cert',
    label: 'Safety Pilot TRUST sertifikası hazır',
    rule: '5.3.3',
    critical: true,
  },
  {
    id: 'remote_id',
    label: 'Here4 Blue Remote ID yayını test edildi',
    rule: '5.3.3',
    critical: true,
  },
  {
    id: 'battery_tape',
    label: 'Tattu Plus parlak turuncu bantla sarıldı',
    rule: '5.3.6',
    critical: true,
  },
  {
    id: 'wpnav_radius',
    label: "WPNAV_RADIUS = 30m ArduPilot'da doğrulandı",
    rule: '3.0.1',
    critical: true,
  },
  {
    id: 'single_cmd',
    label: 'Tek komut otonom kalkış/iniş test edildi',
    rule: '3.2.1',
    critical: true,
  },
  {
    id: 'both_rwy',
    label: "RWY1 ve RWY2 waypoint setleri QGC'ye yüklendi",
    rule: '3.0.2',
    critical: true,
  },
  {
    id: 'no_internet',
    label: 'Safety fonksiyonları internet bağımlı değil',
    rule: '5.3.5',
    critical: true,
  },
  {
    id: 'judge_display',
    label: 'Hakim ekranı açık ve görünür',
    rule: '3.0.6',
    critical: true,
  },
  {
    id: 'rf_freq',
    label: 'RFD900x frekansları ayrı, 462MHz kullanılmıyor',
    rule: '5.3.12',
    critical: true,
  },
  {
    id: 'bay1_loaded',
    label: 'Bay 1 GP908 beacon yüklendi ve kilitli',
    rule: '3.6',
    critical: false,
  },
  {
    id: 'bay2_loaded',
    label: 'Bay 2 su şişesi yüklendi ve kilitli',
    rule: '3.6',
    critical: false,
  },
  { id: 'gps_fix', label: 'GPS RTK Fixed — 14+ uydu', rule: '—', critical: false },
  { id: 'battery_full', label: 'Tattu Plus %100 şarjlı', rule: '—', critical: false },
  {
    id: 'prop_check',
    label: 'Prop ark temizlendi — personel uzakta',
    rule: '5.3.10',
    critical: false,
  },
  {
    id: 'usb_ready',
    label: 'USB sürücü hazır — harita için',
    rule: '3.5.1',
    critical: false,
  },
  {
    id: 'boundary_set',
    label: "Waypoint'ler sınır içinde doğrulandı",
    rule: '3.0.3',
    critical: false,
  },
  { id: 'arm_test', label: 'Arm/disarm testi yapıldı', rule: '—', critical: false },
];

export const PreflightChecklist: React.FC = () => {
  const [items, setItems] = useState<CheckItem[]>(
    CHECKLIST_ITEMS.map((item) => ({ ...item, checked: false }))
  );
  const [isExpanded, setIsExpanded] = useState(true);

  const criticalItems = items.filter((i) => i.critical);
  const highItems = items.filter((i) => !i.critical);
  const criticalDone = criticalItems.filter((i) => i.checked).length;
  const highDone = highItems.filter((i) => i.checked).length;
  const allCritical = criticalDone === criticalItems.length;
  const allDone = criticalDone + highDone === items.length;

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const resetAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, checked: false })));
  };

  return (
    <div className="hud-panel p-3 flex min-w-0 flex-col gap-2">
      {/* Başlık */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="min-w-0"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: allDone ? '#10b981' : allCritical ? '#f59e0b' : '#ef4444',
              flexShrink: 0,
              boxShadow: allDone
                ? '0 0 6px #10b981'
                : allCritical
                  ? '0 0 6px #f59e0b'
                  : '0 0 6px #ef4444',
            }}
          />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              letterSpacing: '0.12em',
              color: '#4a6080',
              lineHeight: 1.35,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            PREFLIGHT KONTROLLERİ
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: allDone ? '#10b981' : '#f59e0b',
              whiteSpace: 'nowrap',
            }}
          >
            {criticalDone + highDone}/{items.length}
          </span>
          <span style={{ color: '#4a6080', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              color: '#ef4444',
              letterSpacing: '0.1em',
              marginBottom: 2,
            }}
          >
            KRİTİK — UÇUŞ ZORUNLU ({criticalDone}/{criticalItems.length})
          </div>

          {criticalItems.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => toggle(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(item.id);
                }
              }}
              className="min-w-0"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '4px 6px',
                borderRadius: 3,
                backgroundColor: item.checked ? '#052e16' : '#450a0a',
                border: `1px solid ${item.checked ? '#064e3b' : '#7f1d1d'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  border: `1px solid ${item.checked ? '#10b981' : '#ef4444'}`,
                  backgroundColor: item.checked ? '#10b981' : 'transparent',
                  flexShrink: 0,
                  marginTop: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: '#fff',
                }}
              >
                {item.checked ? '✓' : ''}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11,
                    color: item.checked ? '#10b981' : '#fca5a5',
                    lineHeight: 1.35,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: '#4a6080',
                    marginTop: 2,
                  }}
                >
                  Rule {item.rule}
                </div>
              </div>
            </div>
          ))}

          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              color: '#f59e0b',
              letterSpacing: '0.1em',
              marginTop: 4,
              marginBottom: 2,
            }}
          >
            YÜKSEK ÖNCELİK ({highDone}/{highItems.length})
          </div>

          {highItems.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => toggle(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(item.id);
                }
              }}
              className="min-w-0"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '4px 6px',
                borderRadius: 3,
                backgroundColor: item.checked ? '#052e16' : '#0d1321',
                border: `1px solid ${item.checked ? '#064e3b' : '#1e2d40'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  border: `1px solid ${item.checked ? '#10b981' : '#2a4060'}`,
                  backgroundColor: item.checked ? '#10b981' : 'transparent',
                  flexShrink: 0,
                  marginTop: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: '#fff',
                }}
              >
                {item.checked ? '✓' : ''}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11,
                    color: item.checked ? '#10b981' : '#8ba3be',
                    lineHeight: 1.35,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item.label}
                  {item.rule !== '—' && (
                    <span
                      className="block hud-mono"
                      style={{ fontSize: 9, color: '#4a6080', marginTop: 2 }}
                    >
                      Rule {item.rule}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetAll();
            }}
            style={{
              padding: '4px',
              borderRadius: 3,
              border: '1px solid #1e2d40',
              backgroundColor: '#0d1321',
              color: '#4a6080',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            ↺ Listeyi Sıfırla
          </button>

          {allCritical && (
            <div
              style={{
                padding: '8px',
                backgroundColor: '#052e16',
                border: '1px solid #10b981',
                borderRadius: 3,
                textAlign: 'center',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: '#10b981',
                letterSpacing: '0.05em',
                lineHeight: 1.35,
              }}
            >
              ✓ KRİTİK KONTROLLER TAMAM — UÇUŞA HAZIR
            </div>
          )}
        </>
      )}
    </div>
  );
};
