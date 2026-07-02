import React from 'react';
// import WallNav from './WallNav'; // 単页の個人プロフィールにするため一旦オフ。複数ページ構成に戻すなら再度有効化。
import WallBackground from './WallBackground';
import WallFrame from './WallFrame';
import WallFrameText from './WallFrameText';
import ShelfSection from './ShelfSection';
import CartridgeTimeline from './CartridgeTimeline';
import wallContent from '../wall-content';
import asset from './wall-asset';

// 100vh に収まる一画面レイアウト（ページ全体はスクロールさせない）。
// 左: OC の額装ポートレート + 自己紹介（額の上には Figma の鳩がとまっている）。
// 右: 上段=いま遊んでいる主力4本の木棚(ShelfSection)、
//     下段=今年の履歴をカセットで並べた時間軸(CartridgeTimeline)。
// 収まりきらないのはカセット帯の横方向だけで、そこは帯自身が横スクロールする。
export default function WallPage({ tweaks }) {
  return (
    <div style={{
      position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#B3B3B3', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Sans SC', sans-serif",
    }}>
      {/* <WallNav /> */}
      <WallBackground />

      {/* 紙テクスチャ(Figma: Backgrounds with paper texture, node 5:2950)。
          multiply なので下の壁色/光暈の明暗はそのまま、紙の繊維の質感だけが乗る。
          素材はシームレスタイルではない(縁が暗い)ので repeat すると継ぎ目が出る
          —— 1画面ページなので cover 1枚で全面を覆う */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url(${asset('wall/paper-texture.webp')})`,
        backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center',
        mixBlendMode: 'multiply', opacity: 0.5,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 80 }}>
        <div style={{ position: 'relative', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {/* 額はすこし傾けて掛ける(鳩ごと、鳩のいる左肩が上がる向き)。紹介文は水平のまま */}
          <div style={{ position: 'relative', transform: 'rotate(2.4deg)', transformOrigin: '50% 60%' }}>
            {/* 額縁の上にとまる鳩(Figma node 1:140)。額の白フチに足が乗る位置 */}
            <img
              src={asset('wall/carts/pigeon.png')} alt=""
              style={{
                position: 'absolute', top: -44, left: 26, width: 62,
                pointerEvents: 'none', zIndex: 1,
              }}
            />
            <WallFrame tweaks={tweaks} />
          </div>
          <WallFrameText content={wallContent.profile} />
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 44,
          flex: '0 1 auto', minWidth: 0, maxWidth: 'min(920px, calc(100vw - 560px))',
        }}>
          <ShelfSection games={wallContent.shelf} />
          <CartridgeTimeline months={wallContent.timeline} />
        </div>
      </div>
    </div>
  );
}
