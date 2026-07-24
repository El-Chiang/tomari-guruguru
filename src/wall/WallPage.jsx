import React from 'react';
// import WallNav from './WallNav'; // 単页の個人プロフィールにするため一旦オフ。複数ページ構成に戻すなら再度有効化。
import WallBackground from './WallBackground';
import WallFrame from './WallFrame';
import WallFrameText from './WallFrameText';
import ShelfSection from './ShelfSection';
import CartridgeTimeline from './CartridgeTimeline';
import wallContent from '../wall-content';
import asset from './wall-asset';

const { useState, useEffect } = React;

// 768px 以下をモバイル扱い。リサイズ/回転にも追従する。
const MOBILE_QUERY = '(max-width: 768px)';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

// デスクトップ: 100vh に収まる一画面レイアウト（ページ全体はスクロールさせない）。
// 左: OC の額装ポートレート + 自己紹介（額の上には Figma の鳩がとまっている）。
// 右: 上段=いま遊んでいる主力4本の木棚(ShelfSection)、
//     下段=今年の履歴をカセットで並べた時間軸(CartridgeTimeline)。
// 収まりきらないのはカセット帯の横方向だけで、そこは帯自身が横スクロールする。
//
// モバイル(≤768px): 縦積みの1カラムにしてページ縦スクロールを解禁。
// 額+紹介文 → 木棚(2本/段の2段) → カセット帯(横スクロールは共通)。
// 光暈と紙テクスチャは fixed でビューポートに貼り付け——スクロールしても
// 壁の照明が動かない & 縦長コンテンツに cover 1枚を引き伸ばさずに済む。
export default function WallPage({ tweaks }) {
  const mobile = useIsMobile();
  return (
    <div style={{
      position: 'relative', width: '100vw', boxSizing: 'border-box',
      background: '#B3B3B3',
      fontFamily: "'IBM Plex Sans SC', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...(mobile
        ? { flexDirection: 'column', minHeight: '100dvh', overflowX: 'hidden', padding: '64px 20px 64px' }
        : { height: '100vh', overflow: 'hidden' }),
    }}>
      {/* <WallNav /> */}
      <WallBackground fixed={mobile} />

      {/* 紙テクスチャ(Figma: Backgrounds with paper texture, node 5:2950)。
          multiply なので下の壁色/光暈の明暗はそのまま、紙の繊維の質感だけが乗る。
          素材はシームレスタイルではない(縁が暗い)ので repeat すると継ぎ目が出る
          —— cover 1枚で全面を覆う(モバイルは fixed でビューポート基準) */}
      <div style={{
        position: mobile ? 'fixed' : 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url(${asset('wall/paper-texture.webp')})`,
        backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center',
        mixBlendMode: 'multiply', opacity: 0.5,
      }} />

      <div style={{
        display: 'flex', alignItems: mobile ? 'center' : 'flex-start', justifyContent: 'center',
        ...(mobile
          ? { flexDirection: 'column', gap: 56, width: '100%', position: 'relative' }
          : { gap: 80 }),
      }}>
        <div style={{ position: 'relative', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: mobile ? 'center' : 'flex-start' }}>
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
          flex: '0 1 auto', minWidth: 0,
          ...(mobile
            ? { width: '100%', alignItems: 'center' }
            : { maxWidth: 'min(920px, calc(100vw - 560px))' }),
        }}>
          <ShelfSection games={wallContent.shelf} perRow={mobile ? 2 : 0} />
          <div style={{ width: '100%', minWidth: 0 }}>
            <CartridgeTimeline months={wallContent.timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}
