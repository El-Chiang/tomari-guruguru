import React from 'react';

const { useState } = React;

// 「いま遊んでいる」木棚。Figma の ALBUM(node 1:145) / WOOD SHELF(node 1:149) の
// レシピを踏襲: 両脇のぼかし影で奥行きを出し、下端の暗いビネット(darken)で棚に
// 接地させ、棚板は6層 box-shadow の落ち影で浮かせる。
// ※元レシピの艶テクスチャ(screen)+斜めハイライト(lighten)は、ゲームカバーだと
//   白っぽい筋が乗って浮いて見えたので外した(レコードジャケット向けの演出だった)。
// 主力4本だけに絞ったのでカバーは Steam 縦長キャプセル比率のまま大きめ。
// hover でそっと持ち上がる（棚から抜き取る手前の感じ）。
// 5本並べても 1280px 幅のビューポート(右カラム実効 720px)に収まる上限が
// この幅: 5*(108+12*2) + 14*4 = 716。
const COVER = { width: 108, height: 162 };
const SHADOW_W = 12;
const GAP = 14;

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
          fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 10, lineHeight: 1.3,
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
      <div className="wall-album-jacket" style={{
        position: 'relative', flex: '0 0 auto', width: COVER.width, height: COVER.height,
        borderRadius: 2, overflow: 'hidden', boxShadow: '0px 2px 5px 0px rgba(0,0,0,0.4)',
      }}>
        <AlbumArt game={game} />
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'darken',
          backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 88%, rgba(0,0,0,0.3) 100%)',
        }} />
      </div>
      <AlbumShadow side="right" />
    </>
  );
  const style = { display: 'flex', alignItems: 'flex-end', textDecoration: 'none', color: 'inherit' };
  if (!game.url) {
    return <div className="wall-album" title={game.name} style={style}>{inner}</div>;
  }
  return (
    <a className="wall-album" href={game.url} target="_blank" rel="noreferrer" title={game.name} style={style}>
      {inner}
    </a>
  );
}

function Shelf({ width }) {
  return (
    <div style={{
      position: 'relative', width, height: 15, marginTop: -6, borderRadius: 2, overflow: 'hidden',
      boxShadow: '0px 24px 30px 0px rgba(0,0,0,0.5), 0px 16px 18px 0px rgba(0,0,0,0.4), 0px 9px 10px 0px rgba(0,0,0,0.33), 0px 4.5px 5px 0px rgba(0,0,0,0.26), 0px 2px 2.5px 0px rgba(0,0,0,0.2), 0px 0.5px 1.2px 0px rgba(0,0,0,0.16)',
    }}>
      <img src="wall/shelf-wood.webp" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'bottom' }} />
    </div>
  );
}

export default function ShelfSection({ games }) {
  if (!games || !games.length) return null;
  const itemWidth = COVER.width + SHADOW_W * 2;
  const rowWidth = itemWidth * games.length + GAP * (games.length - 1);
  return (
    <div style={{ position: 'relative', flex: '0 0 auto' }}>
      <p style={{
        margin: '0 0 4px', fontFamily: "'Fraunces', serif", fontWeight: 600,
        fontSize: 20, color: 'rgba(0,0,0,0.8)',
      }}>
        最近遊んでいる
      </p>
      <p style={{
        margin: '0 0 18px', fontFamily: "'IBM Plex Sans SC', sans-serif",
        fontSize: 10, color: 'rgba(0,0,0,0.4)',
      }}>
        Now Playing · 2026.06–07
      </p>
      <div style={{ display: 'flex', gap: GAP }}>
        {games.map((g) => <AlbumCover key={g.appid ?? g.name} game={g} />)}
      </div>
      <Shelf width={rowWidth} />
      <div style={{ display: 'flex', gap: GAP, marginTop: 10 }}>
        {games.map((g) => (
          <div key={g.appid ?? g.name} style={{ width: itemWidth, textAlign: 'center' }}>
            <div style={{
              fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.75)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {g.name}
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>
              {g.hours != null ? `${g.hours}h` : (g.note || ' ')}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .wall-album .wall-album-jacket { transition: transform 260ms cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 260ms ease; }
        .wall-album:hover .wall-album-jacket {
          transform: translateY(-8px);
          box-shadow: 0px 12px 16px 0px rgba(0,0,0,0.35);
        }
      `}</style>
    </div>
  );
}
