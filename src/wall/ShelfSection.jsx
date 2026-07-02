import React from 'react';

const { useState } = React;

// 月ごとの棚。Figma の ALBUM(node 1:145) / WOOD SHELF(node 1:149) のレシピを踏襲:
// 両脇のぼかし影で奥行きを出し、艶テクスチャ(screen)+斜めハイライト(lighten)+
// 下端の暗いビネット(darken)をカバーに重ね、棚板は6層 box-shadow の落ち影で浮かせる。
// カバー比率は Steam の縦長キャプセルに合わせて正方形から変更、月ごとに数が
// 変わる(1〜8本)ので棚1本ぶんが小型化している。
const COVER = { width: 62, height: 88 };
const SHADOW_W = 9;
const GAP = 10;

function AlbumShadow({ side }) {
  return (
    <div style={{
      flex: '0 0 auto', width: SHADOW_W, height: COVER.height,
      transform: side === 'left' ? 'scaleX(-1)' : undefined,
    }}>
      <img src="wall/album-shadow-right.svg" alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}

// カバー画像が無い/読み込みに失敗した作品は、ジャケ無しの背表紙風プレースホルダーへ。
function AlbumArt({ game }) {
  const [broken, setBroken] = useState(false);
  if (!game.cover || broken) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#ded6c4', padding: 4, boxSizing: 'border-box',
      }}>
        <span style={{
          fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 9, lineHeight: 1.3,
          color: 'rgba(0,0,0,0.55)', textAlign: 'center', wordBreak: 'break-word',
        }}>
          {game.name}
        </span>
      </div>
    );
  }
  return (
    <img
      src={game.cover} alt={game.name} onError={() => setBroken(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

function AlbumCover({ game }) {
  const inner = (
    <>
      <AlbumShadow side="left" />
      <div style={{
        position: 'relative', flex: '0 0 auto', width: COVER.width, height: COVER.height,
        borderRadius: 2, overflow: 'hidden', boxShadow: '0px 2px 5px 0px rgba(0,0,0,0.4)',
      }}>
        <AlbumArt game={game} />
        <img
          src="wall/album-shine.webp" alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'screen', opacity: 0.4 }}
        />
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'lighten',
          backgroundImage: 'linear-gradient(142.3deg, rgba(255,255,255,0.4) 5.6672%, rgba(255,255,255,0.4) 25.966%, rgba(255,255,255,0) 28.249%, rgba(255,255,255,0) 44.883%, rgba(255,255,255,0.236) 48.282%, rgba(255,255,255,0) 52.971%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'darken',
          backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 88%, rgba(0,0,0,0.3) 100%)',
        }} />
      </div>
      <AlbumShadow side="right" />
    </>
  );
  if (!game.url) {
    return <div title={game.name} style={{ display: 'flex', alignItems: 'flex-end' }}>{inner}</div>;
  }
  return (
    <a
      href={game.url} target="_blank" rel="noreferrer" title={game.name}
      style={{ display: 'flex', alignItems: 'flex-end', textDecoration: 'none', color: 'inherit' }}
    >
      {inner}
    </a>
  );
}

function Shelf({ width }) {
  return (
    <div style={{
      position: 'relative', width, height: 14, marginTop: -6, borderRadius: 2, overflow: 'hidden',
      boxShadow: '0px 24px 30px 0px rgba(0,0,0,0.5), 0px 16px 18px 0px rgba(0,0,0,0.4), 0px 9px 10px 0px rgba(0,0,0,0.33), 0px 4.5px 5px 0px rgba(0,0,0,0.26), 0px 2px 2.5px 0px rgba(0,0,0,0.2), 0px 0.5px 1.2px 0px rgba(0,0,0,0.16)',
    }}>
      <img src="wall/shelf-wood.webp" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'bottom' }} />
    </div>
  );
}

function MonthShelf({ month, games }) {
  const itemWidth = COVER.width + SHADOW_W * 2;
  const rowWidth = itemWidth * games.length + GAP * (games.length - 1);
  return (
    <div>
      <p style={{
        margin: '0 0 10px', fontFamily: "'Fraunces', serif", fontWeight: 600,
        fontSize: 14, color: 'rgba(0,0,0,0.6)',
      }}>
        {month}
      </p>
      <div style={{ display: 'flex', gap: GAP }}>
        {games.map((g) => <AlbumCover key={g.appid ?? g.name} game={g} />)}
      </div>
      <Shelf width={rowWidth} />
      <div style={{ display: 'flex', gap: GAP, marginTop: 8 }}>
        {games.map((g) => (
          <div key={g.appid ?? g.name} style={{ width: itemWidth, textAlign: 'center' }}>
            <div style={{
              fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 10, fontWeight: 500, color: 'rgba(0,0,0,0.75)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {g.name}
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 9, color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>
              {g.hours != null ? `${g.hours}h` : (g.note || ' ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShelfSection({ months }) {
  if (!months || !months.length) return null;
  return (
    <div style={{ position: 'relative', flex: '0 0 auto' }}>
      <p style={{
        margin: '0 0 16px', fontFamily: "'Fraunces', serif", fontWeight: 600,
        fontSize: 20, color: 'rgba(0,0,0,0.8)',
      }}>
        最近遊んだもの
      </p>
      <div className="wall-shelf-scroll" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', paddingRight: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {months.map((m) => <MonthShelf key={m.month} month={m.month} games={m.games} />)}
        </div>
      </div>
      <style>{`
        .wall-shelf-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent; }
        .wall-shelf-scroll::-webkit-scrollbar { width: 6px; }
        .wall-shelf-scroll::-webkit-scrollbar-track { background: transparent; }
        .wall-shelf-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 999px; }
      `}</style>
    </div>
  );
}
