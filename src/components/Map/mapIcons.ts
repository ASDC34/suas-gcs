import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export function createDroneIcon(heading: number, armed: boolean): L.DivIcon {
  const color = armed ? '#ef4444' : '#3b82f6';
  const glowColor = armed ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)';

  const svgContent = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${glowColor}" />
      <circle cx="20" cy="20" r="8" fill="${color}" opacity="0.9"/>
      <polygon points="20,4 23,16 17,16" fill="${color}"/>
      <line x1="8"  y1="8"  x2="16" y2="16" stroke="${color}" stroke-width="2"/>
      <line x1="32" y1="8"  x2="24" y2="16" stroke="${color}" stroke-width="2"/>
      <line x1="8"  y1="32" x2="16" y2="24" stroke="${color}" stroke-width="2"/>
      <line x1="32" y1="32" x2="24" y2="24" stroke="${color}" stroke-width="2"/>
      <circle cx="8"  cy="8"  r="4" fill="${color}" opacity="0.7"/>
      <circle cx="32" cy="8"  r="4" fill="${color}" opacity="0.7"/>
      <circle cx="8"  cy="32" r="4" fill="${color}" opacity="0.7"/>
      <circle cx="32" cy="32" r="4" fill="${color}" opacity="0.7"/>
    </svg>
  `;

  return L.divIcon({
    html: `<div style="transform: rotate(${heading}deg); transform-origin: 50% 50%;">${svgContent}</div>`,
    className: armed ? 'drone-icon-active' : '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

export function createWaypointIcon(
  index: number,
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED',
  type: string
): L.DivIcon {
  const color =
    status === 'COMPLETED' ? '#10b981' : status === 'ACTIVE' ? '#f59e0b' : '#3b82f6';

  const bgColor =
    status === 'COMPLETED' ? '#052e16' : status === 'ACTIVE' ? '#451a03' : '#1e3a5f';

  const shape = type === 'DELIVERY' ? '◆' : '';

  return L.divIcon({
    html: `
      <div style="
        width: 28px; height: 28px;
        border-radius: 50%;
        background: ${bgColor};
        border: 2px solid ${color};
        display: flex; align-items: center; justify-content: center;
        font-family: 'Rajdhani', monospace;
        font-size: 12px; font-weight: 700;
        color: ${color};
        box-shadow: 0 0 8px ${color}60;
        ${status === 'ACTIVE' ? 'animation: waypoint-pulse 1s ease-in-out infinite;' : ''}
      ">
        ${shape || index}
      </div>
    `,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function createGhostIcon(heading: number): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        opacity: 0.35;
        transform: rotate(${heading}deg);
        transform-origin: 50% 50%;
      ">
        <svg width="32" height="32" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="8" fill="#9ca3af"/>
          <polygon points="20,4 23,16 17,16" fill="#9ca3af"/>
          <line x1="8" y1="8" x2="16" y2="16" stroke="#9ca3af" stroke-width="1.5"/>
          <line x1="32" y1="8" x2="24" y2="16" stroke="#9ca3af" stroke-width="1.5"/>
          <line x1="8" y1="32" x2="16" y2="24" stroke="#9ca3af" stroke-width="1.5"/>
          <line x1="32" y1="32" x2="24" y2="24" stroke="#9ca3af" stroke-width="1.5"/>
          <circle cx="8" cy="8" r="3" fill="#9ca3af" opacity="0.6"/>
          <circle cx="32" cy="8" r="3" fill="#9ca3af" opacity="0.6"/>
          <circle cx="8" cy="32" r="3" fill="#9ca3af" opacity="0.6"/>
          <circle cx="32" cy="32" r="3" fill="#9ca3af" opacity="0.6"/>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function createTargetIcon(type: 'TENT' | 'MANNEQUIN'): L.DivIcon {
  const emoji = type === 'TENT' ? '⛺' : '🧍';
  const color = type === 'TENT' ? '#f59e0b' : '#a78bfa';

  return L.divIcon({
    html: `
      <div style="
        width: 36px; height: 36px;
        border-radius: 50%;
        background: ${color}20;
        border: 2px solid ${color};
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        box-shadow: 0 0 12px ${color}60;
      ">
        ${emoji}
      </div>
    `,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

