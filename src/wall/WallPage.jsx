import React from 'react';
// import WallNav from './WallNav'; // 単页の個人プロフィールにするため一旦オフ。複数ページ構成に戻すなら再度有効化。
import WallBackground from './WallBackground';
import WallFrame from './WallFrame';
import WallFrameText from './WallFrameText';
import ShelfSection from './ShelfSection';
import wallContent from '../wall-content';

// 100vh に収まる一画面レイアウト（ページ全体はスクロールさせない）。
// 左: OC の額装ポートレート + 自己紹介。右: ゲームの展示エリア（フェーズ毎に追加）。
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

      {/* 額と「最近よく遊んでいる」の上端を揃える。ブロック全体は画面中央に来る */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 72 }}>
        <div style={{ position: 'relative', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <WallFrame tweaks={tweaks} />
          <WallFrameText content={wallContent.profile} />
        </div>

        <ShelfSection games={wallContent.shelfGames} />
      </div>
    </div>
  );
}
