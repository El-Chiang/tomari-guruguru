import React from 'react';

// ページ全体は縦スクロールさせない制約なので、収まりきらない分はここに横スクロールで
// 逃がす。ネイティブの太いスクロールバーは浮くので、薄いバー(thin)に絞ってページの
// 落ち着いた質感を崩さないようにする。
const CARD = { width: 140, height: 84 };

export default function TimelineSection({ games }) {
  if (!games || !games.length) return null;
  return (
    <div style={{ position: 'relative', width: 'min(920px, 82vw)' }}>
      <p style={{
        margin: '0 0 14px', fontFamily: "'Fraunces', serif", fontWeight: 600,
        fontSize: 16, color: 'rgba(0,0,0,0.6)',
      }}>
        これまで遊んだもの
      </p>
      <div className="wall-timeline-scroll" style={{
        display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 6,
        scrollSnapType: 'x proximity',
      }}>
        {games.map((g) => (
          <a
            key={g.appid} href={g.url} target="_blank" rel="noreferrer"
            style={{ flex: '0 0 auto', display: 'block', textDecoration: 'none', color: 'inherit', scrollSnapAlign: 'start' }}
          >
            <div style={{
              width: CARD.width, height: CARD.height, borderRadius: 4, overflow: 'hidden',
              boxShadow: '0px 3px 8px 0px rgba(0,0,0,0.35)',
            }}>
              <img
                src={g.cover} alt={g.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div style={{ marginTop: 6, width: CARD.width }}>
              <div style={{
                fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 11, fontWeight: 500,
                color: 'rgba(0,0,0,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {g.name}
              </div>
              <div style={{ fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>
                {g.hours}h
              </div>
            </div>
          </a>
        ))}
      </div>
      <style>{`
        .wall-timeline-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent; }
        .wall-timeline-scroll::-webkit-scrollbar { height: 6px; }
        .wall-timeline-scroll::-webkit-scrollbar-track { background: transparent; }
        .wall-timeline-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 999px; }
      `}</style>
    </div>
  );
}
