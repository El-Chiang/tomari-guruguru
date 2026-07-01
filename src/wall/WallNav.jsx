import React from 'react';
import wallContent from '../wall-content';

const NAV_ITEMS = ['Wall*', 'Blog', 'About'];

const ICON_BTN = {
  width: 40, height: 40, borderRadius: 8, border: 'none', background: 'transparent',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
};
const TEXT_BTN = {
  padding: 12, borderRadius: 8, fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 16,
  color: '#000', textDecoration: 'none', whiteSpace: 'nowrap', lineHeight: 1,
};

export default function WallNav() {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      width: '100%', height: 88, boxSizing: 'border-box',
      padding: '24px 0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      mixBlendMode: 'color-burn',
    }}>
      <div style={{ width: 864, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, letterSpacing: '0.02em', color: '#000' }}>
          {wallContent.profile.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button type="button" style={ICON_BTN}>
            <img src="wall/icon-search.svg" alt="Search" style={{ width: 24, height: 24 }} />
          </button>
          {NAV_ITEMS.map((label) => (
            <a key={label} href="#" style={TEXT_BTN}>{label}</a>
          ))}
          <button type="button" style={ICON_BTN}>
            <img src="wall/icon-caret-down.svg" alt="More" style={{ width: 24, height: 24 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
