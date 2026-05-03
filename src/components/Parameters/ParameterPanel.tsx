import React, { useMemo, useState } from 'react';

interface ArduParam {
  name: string;
  value: number;
  defaultValue: number;
  unit: string;
  description: string;
  category: string;
  critical: boolean;
  editable: boolean;
}

const ARDUPILOT_PARAMS: ArduParam[] = [
  { name: 'WPNAV_RADIUS', value: 30, defaultValue: 200, unit: 'cm', description: 'Waypoint kabul yarıçapı — Rule 3.0.1: 100ft=30m=3000cm', category: 'Navigasyon', critical: true, editable: true },
  { name: 'WPNAV_SPEED', value: 1500, defaultValue: 500, unit: 'cm/s', description: 'Waypoint seyir hızı (15 m/s)', category: 'Navigasyon', critical: false, editable: true },
  { name: 'WPNAV_SPEED_UP', value: 250, defaultValue: 250, unit: 'cm/s', description: 'Maksimum tırmanış hızı', category: 'Navigasyon', critical: false, editable: true },
  { name: 'WPNAV_SPEED_DN', value: 150, defaultValue: 150, unit: 'cm/s', description: 'Maksimum iniş hızı', category: 'Navigasyon', critical: false, editable: true },
  { name: 'WPNAV_ACCEL', value: 250, defaultValue: 250, unit: 'cm/s²', description: 'Yatay ivme', category: 'Navigasyon', critical: false, editable: true },

  { name: 'BATT_LOW_VOLT', value: 43.2, defaultValue: 10.5, unit: 'V', description: 'Düşük pil uyarı gerilimi (12S: 3.6V/hücre)', category: 'Pil', critical: true, editable: true },
  { name: 'BATT_CRT_VOLT', value: 42.0, defaultValue: 9.6, unit: 'V', description: 'Kritik pil gerilimi (12S: 3.5V/hücre)', category: 'Pil', critical: true, editable: true },
  { name: 'BATT_FS_LOW_ACT', value: 2, defaultValue: 0, unit: '', description: '0=Yok 1=Arazi 2=RTL 3=SmartRTL', category: 'Pil', critical: true, editable: true },
  { name: 'BATT_CAPACITY', value: 22000, defaultValue: 3300, unit: 'mAh', description: 'Tattu Plus 22000mAh', category: 'Pil', critical: false, editable: true },

  { name: 'FS_THR_ENABLE', value: 1, defaultValue: 1, unit: '', description: 'RC sinyal kayıp failsafe: 1=RTL', category: 'Güvenlik', critical: true, editable: false },
  { name: 'FS_THR_VALUE', value: 975, defaultValue: 975, unit: 'PWM', description: 'RC failsafe PWM eşiği', category: 'Güvenlik', critical: true, editable: true },
  { name: 'FENCE_ENABLE', value: 1, defaultValue: 0, unit: '', description: 'Geo-fence aktif', category: 'Güvenlik', critical: true, editable: true },
  { name: 'FENCE_ACTION', value: 1, defaultValue: 0, unit: '', description: '0=Rapor 1=RTL 2=Hover', category: 'Güvenlik', critical: true, editable: true },
  { name: 'FENCE_ALT_MAX', value: 122, defaultValue: 100, unit: 'm', description: 'Maksimum irtifa (400ft=122m)', category: 'Güvenlik', critical: true, editable: true },

  { name: 'GPS_TYPE', value: 9, defaultValue: 1, unit: '', description: '9=DroneCAN (Here4 Blue)', category: 'GPS', critical: false, editable: false },
  { name: 'GPS_AUTO_SWITCH', value: 1, defaultValue: 0, unit: '', description: 'Otomatik GPS geçişi', category: 'GPS', critical: false, editable: true },
  { name: 'AHRS_EKF_TYPE', value: 3, defaultValue: 3, unit: '', description: '3=EKF3 (önerilen)', category: 'GPS', critical: false, editable: false },

  { name: 'RID_ENABLE', value: 1, defaultValue: 0, unit: '', description: 'Remote ID aktif — Rule 5.3.3 ZORUNLU', category: 'Remote ID', critical: true, editable: false },

  { name: 'SERVO9_FUNCTION', value: 0, defaultValue: 0, unit: '', description: 'Bay 1 servo (ch9) — passthrough', category: 'Payload', critical: false, editable: false },
  { name: 'SERVO10_FUNCTION', value: 0, defaultValue: 0, unit: '', description: 'Bay 2 servo (ch10) — passthrough', category: 'Payload', critical: false, editable: false },
  { name: 'SERVO9_MIN', value: 1100, defaultValue: 1100, unit: 'PWM', description: 'Bay 1 kapalı PWM', category: 'Payload', critical: false, editable: true },
  { name: 'SERVO9_MAX', value: 1900, defaultValue: 1900, unit: 'PWM', description: 'Bay 1 açık PWM', category: 'Payload', critical: false, editable: true },
  { name: 'SERVO10_MIN', value: 1100, defaultValue: 1100, unit: 'PWM', description: 'Bay 2 kapalı PWM', category: 'Payload', critical: false, editable: true },
  { name: 'SERVO10_MAX', value: 1900, defaultValue: 1900, unit: 'PWM', description: 'Bay 2 açık PWM', category: 'Payload', critical: false, editable: true },

  { name: 'ARSPD_TYPE', value: 1, defaultValue: 0, unit: '', description: '1=Analog (Matek ASPD-4525)', category: 'Sensörler', critical: false, editable: false },
  { name: 'ARSPD_USE', value: 0, defaultValue: 0, unit: '', description: '0=Bağımsız bilgi (copter)', category: 'Sensörler', critical: false, editable: false },
];

const CATEGORIES = ['Tümü', 'Navigasyon', 'Pil', 'Güvenlik', 'GPS', 'Remote ID', 'Payload', 'Sensörler'];

export const ParameterPanel: React.FC = () => {
  const [params, setParams] = useState<ArduParam[]>(ARDUPILOT_PARAMS);
  const [search, setSearch] = useState('');
  const [activeCategory, setCategory] = useState('Tümü');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savedParams, setSavedParams] = useState<Set<string>>(new Set());
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  const filtered = useMemo(() => {
    return params.filter((p) => {
      const matchSearch =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = activeCategory === 'Tümü' || p.category === activeCategory;
      const matchCritical = !showCriticalOnly || p.critical;
      return matchSearch && matchCategory && matchCritical;
    });
  }, [params, search, activeCategory, showCriticalOnly]);

  const startEdit = (param: ArduParam) => {
    if (!param.editable) return;
    setEditingId(param.name);
    setEditValue(String(param.value));
  };

  const saveEdit = (name: string) => {
    const newVal = parseFloat(editValue);
    if (Number.isNaN(newVal)) return;
    setParams((prev) => prev.map((p) => (p.name === name ? { ...p, value: newVal } : p)));
    setSavedParams((prev) => new Set(Array.from(prev).concat(name)));
    setEditingId(null);
    // eslint-disable-next-line no-console
    console.log(`MAVLink PARAM_SET: ${name} = ${newVal}`);
    setTimeout(
      () =>
        setSavedParams((prev) => {
          const s = new Set(prev);
          s.delete(name);
          return s;
        }),
      2000
    );
  };

  const criticalCount = params.filter((p) => p.critical).length;
  const criticalOk = params.filter((p) => p.critical && p.value !== p.defaultValue).length;

  return (
    <div
      style={{
        backgroundColor: '#0d1321',
        border: '1px solid #1e2d40',
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #1e2d40',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              letterSpacing: '0.15em',
              color: '#4a6080',
            }}
          >
            ARDUPILOT PARAMETRELERİ
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: criticalOk > 0 ? '#10b981' : '#f59e0b',
              backgroundColor: criticalOk > 0 ? '#052e16' : '#451a03',
              border: `1px solid ${criticalOk > 0 ? '#064e3b' : '#78350f'}`,
              borderRadius: 3,
              padding: '1px 6px',
            }}
          >
            {criticalOk}/{criticalCount} kritik
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('MAVLink: PARAM_REQUEST_LIST gönderiliyor...');
          }}
          style={{
            padding: '3px 10px',
            borderRadius: 3,
            border: '1px solid #3b82f6',
            backgroundColor: '#1e3a5f',
            color: '#3b82f6',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          ↓ DRONE&apos;DAN OKU
        </button>
      </div>

      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #1e2d40',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          placeholder="Parametre ara... (WPNAV, BATT, GPS...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '5px 10px',
            backgroundColor: '#070b14',
            border: '1px solid #1e2d40',
            borderRadius: 3,
            color: '#f0f4f8',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              style={{
                padding: '2px 8px',
                borderRadius: 3,
                border: `1px solid ${activeCategory === cat ? '#3b82f6' : '#1e2d40'}`,
                backgroundColor: activeCategory === cat ? '#1e3a5f' : '#070b14',
                color: activeCategory === cat ? '#3b82f6' : '#4a6080',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCriticalOnly(!showCriticalOnly)}
            style={{
              padding: '2px 8px',
              borderRadius: 3,
              border: `1px solid ${showCriticalOnly ? '#ef4444' : '#1e2d40'}`,
              backgroundColor: showCriticalOnly ? '#450a0a' : '#070b14',
              color: showCriticalOnly ? '#ef4444' : '#4a6080',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            🔴 Kritik
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '180px 80px 80px 1fr',
            gap: 8,
            padding: '4px 12px',
            borderBottom: '1px solid #1e2d40',
            position: 'sticky',
            top: 0,
            backgroundColor: '#0d1321',
            zIndex: 1,
          }}
        >
          {['PARAMETRE', 'DEĞER', 'BİRİM', 'AÇIKLAMA'].map((h) => (
            <div
              key={h}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                letterSpacing: '0.1em',
                color: '#4a6080',
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {filtered.map((param) => (
          <div
            key={param.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 80px 80px 1fr',
              gap: 8,
              padding: '5px 12px',
              borderBottom: '1px solid #0d1321',
              backgroundColor: param.critical ? '#0d1321' : 'transparent',
              borderLeft: param.critical ? '2px solid #ef444440' : '2px solid transparent',
              alignItems: 'center',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = param.critical ? '#0d1321' : 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {param.critical && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: param.critical ? '#fca5a5' : '#8ba3be',
                  fontWeight: param.critical ? 700 : 400,
                }}
              >
                {param.name}
              </span>
            </div>

            <div>
              {editingId === param.name ? (
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveEdit(param.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(param.name);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '1px 4px',
                    backgroundColor: '#1e3a5f',
                    border: '1px solid #3b82f6',
                    borderRadius: 2,
                    color: '#3b82f6',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                  }}
                />
              ) : (
                <span
                  role={param.editable ? 'button' : undefined}
                  tabIndex={param.editable ? 0 : undefined}
                  onClick={() => startEdit(param)}
                  onKeyDown={(e) => {
                    if (!param.editable) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      startEdit(param);
                    }
                  }}
                  style={{
                    fontFamily: "'Rajdhani', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: savedParams.has(param.name)
                      ? '#10b981'
                      : param.value !== param.defaultValue
                        ? '#f59e0b'
                        : '#f0f4f8',
                    cursor: param.editable ? 'pointer' : 'default',
                    padding: '1px 4px',
                    borderRadius: 2,
                    border: param.editable ? '1px solid transparent' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (param.editable) e.currentTarget.style.borderColor = '#1e2d40';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {param.value}
                </span>
              )}
            </div>

            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: '#4a6080',
              }}
            >
              {param.unit}
            </div>

            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                color: '#4a6080',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={param.description}
            >
              {param.description}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '4px 12px',
          borderTop: '1px solid #1e2d40',
          display: 'flex',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            color: '#4a6080',
          }}
        >
          {filtered.length} / {params.length} parametre · Sarı = değiştirilmiş
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: '#4a6080',
          }}
        >
          MAVLink PARAM_SET · Tıkla→Düzenle
        </span>
      </div>
    </div>
  );
};
