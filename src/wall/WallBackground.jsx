import React from 'react';

// SHINY BG — 壁に落ちる柔らかい光暈。Figma のエフェクトをそのまま焼き込んだ
// 1494x1044 の PNG を、元のコンテナ(1094x644)に対して同じ inset で配置する
// （実測: -31.06% -18.28% でぴったり 1494x1044 になることを確認済み）。
// 1画面レイアウトに合わせて、コンテナ自体はページ中央に配置する。
const BOX = { width: 1094, height: 644 };

export default function WallBackground() {
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      width: BOX.width, height: BOX.height,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }}>
      <div style={{ position: 'absolute', inset: '-31.06% -18.28%' }}>
        <img src="wall/bg-shine.png" alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
