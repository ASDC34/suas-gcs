import React, { useRef, useState } from 'react';

const DEFAULT_CAMERA_URL =
  process.env.REACT_APP_CAMERA_URL ?? 'http://localhost:8080/?action=stream';

export const CameraSection: React.FC = () => {
  const [cameraUrl, setCameraUrl] = useState(DEFAULT_CAMERA_URL);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleSnapshot = () => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = imgRef.current.naturalWidth || 640;
    canvas.height = imgRef.current.naturalHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(imgRef.current, 0, 0);
    const link = document.createElement('a');
    link.download = `snapshot_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    setSnapshotCount((n) => n + 1);
  };

  return (
    <div
      style={{
        backgroundColor: '#0d1321',
        border: '1px solid #1e2d40',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderBottom: '1px solid #1e2d40',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#ef4444',
              boxShadow: isConnected ? '0 0 6px #10b981' : '0 0 6px #ef4444',
            }}
          />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              letterSpacing: '0.15em',
              color: '#4a6080',
            }}
          >
            KAMERA — IMX477
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={handleSnapshot}
            title="Snapshot al"
            style={{
              padding: '2px 8px',
              borderRadius: 3,
              border: '1px solid #1e2d40',
              backgroundColor: '#070b14',
              color: '#8ba3be',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            📷 {snapshotCount > 0 && snapshotCount}
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              padding: '2px 6px',
              borderRadius: 3,
              border: '1px solid #1e2d40',
              backgroundColor: '#070b14',
              color: '#8ba3be',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {isFullscreen ? '⊡' : '⊞'}
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          backgroundColor: '#000',
          height: isFullscreen ? 300 : 160,
          transition: 'height 0.3s',
        }}
      >
        <img
          ref={imgRef}
          src={cameraUrl}
          alt="Kamera feed"
          onLoad={() => setIsConnected(true)}
          onError={() => setIsConnected(false)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: isConnected ? 'block' : 'none',
          }}
        />

        {!isConnected && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 24, opacity: 0.3 }}>📷</div>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                color: '#4a6080',
                textAlign: 'center',
              }}
            >
              Kamera bağlantısı yok<br />
              <span style={{ fontSize: 9 }}>{cameraUrl}</span>
            </div>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: '#10b981',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '2px 4px',
            borderRadius: 2,
          }}
        >
          NADIR · 150ft AGL · 30fps
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            color: '#f59e0b',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '2px 6px',
            borderRadius: 2,
          }}
        >
          YOLOv8 AKTIF
        </div>
      </div>

      <div style={{ padding: '4px 8px', borderTop: '1px solid #1e2d40' }}>
        <input
          type="text"
          value={cameraUrl}
          onChange={(e) => setCameraUrl(e.target.value)}
          placeholder="http://JETSON_IP:8080/?action=stream"
          style={{
            width: '100%',
            padding: '2px 6px',
            backgroundColor: '#070b14',
            border: '1px solid #1e2d40',
            borderRadius: 3,
            color: '#8ba3be',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
};
