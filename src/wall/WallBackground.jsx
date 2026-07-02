import React from 'react';
import asset from './wall-asset';

// SHINY BG — 壁に落ちる柔らかい光暈。Figma のエフェクトをそのまま焼き込んだ
// PNG を、元のコンテナ(1094x644)に対して inset で配置する。
// 元の書き出し(1494x1044, inset -31.06% -18.28%)には Figma の黒い NAV バーが
// 上端に焼き込まれていて、背の高いビューポートで露出したため上 92px を
// クロップ済み(現 1494x952)。その分だけ top inset を浅くしてある:
//   top = -(200-92)/644 = -16.77%, bottom は従来どおり -200/644 = -31.06%。
// 1画面レイアウトに合わせて、コンテナ自体はページ中央に配置する。
// fixed=true（モバイルの縦スクロールページ）ではビューポート中央に固定し、
// スクロールしても壁の照明が動かないようにする。
const BOX = { width: 1094, height: 644 };

export default function WallBackground({ fixed = false }) {
  return (
    <div style={{
      position: fixed ? 'fixed' : 'absolute', left: '50%', top: '50%',
      width: BOX.width, height: BOX.height,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }}>
      <div style={{ position: 'absolute', inset: '-16.77% -18.28% -31.06%' }}>
        <img src={asset('wall/bg-shine.png')} alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
