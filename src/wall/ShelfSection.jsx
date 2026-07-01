import React from 'react';

// 最近よく遊んでいるゲームのコンパクトな展示。100vh 一画面に収める都合で
// Figma の木架演出はそのまま持ち込まず、投影/角丸などの質感だけ踏襲する。
const CARD = { width: 168, height: 224 };

export default function ShelfSection({ games }) {
  if (!games || !games.length) return null;
  return (
    <div style={{ position: 'relative', flex: '0 0 auto' }}>
      <p style={{
        margin: '0 0 20px', fontFamily: "'Fraunces', serif", fontWeight: 600,
        fontSize: 20, color: 'rgba(0,0,0,0.8)',
      }}>
        最近よく遊んでいる
      </p>
      <div style={{ display: 'flex', gap: 28 }}>
        {games.map((g) => (
          <a
            key={g.appid} href={g.url} target="_blank" rel="noreferrer"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{
              width: CARD.width, height: CARD.height, borderRadius: 4, overflow: 'hidden',
              boxShadow: '0px 3px 8px 0px rgba(0,0,0,0.4)',
            }}>
              <img
                src={g.cover} alt={g.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div style={{ marginTop: 8, width: CARD.width }}>
              <div style={{ fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,0.8)' }}>
                {g.name}
              </div>
              <div style={{ fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
                {g.hours}h{g.lastPlayed ? ` · ${g.lastPlayed}` : ''}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
