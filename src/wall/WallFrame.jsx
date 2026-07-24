import React from 'react';
import OcPortrait from '../oc-portrait';
import asset from './wall-asset';

// 元 KATZE の画框位。猫の素描の代わりに、生きている OC を額装する。
// キャラは額いっぱいに詰めず、一回り小さく中央に置く（額の背景＝壁の光暈が
// 周りに見える、証明写真のような余白のある見せ方）。
const FRAME = { width: 280, height: 280 };
const RENDER_BASE = 480; // キャラの見た目サイズの基準。額のサイズ変更と切り離す
const PORTRAIT_SCALE = 0.675; // 前回(1.35=額を満たす)の半分
// レンダー矩形(=キャラの正方形キャンバス)は額より小さいので、bottom:0 で
// 端を揃えても中身が"ぴったり"には見えない――キャンバス自体の下端に素材の
// 透明マージンがあるから。負の bottom で矩形ごと額の下に押し出し、その
// 透明部分を overflow:hidden でクロップする。
const BOTTOM_PUSH = -90;

export default function WallFrame({ tweaks }) {
  const renderSize = RENDER_BASE * PORTRAIT_SCALE;
  return (
    <div
      style={{
        position: 'relative', flex: '0 0 auto',
        width: FRAME.width, height: FRAME.height,
        boxSizing: 'border-box',
        border: '8px solid #fff',
        boxShadow: '0px 16px 11px 0px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}
    >
      {/* 額の内張り: くしゃっとした紙テクスチャ(Figma: paper texture, node 12:3062)。
          壁(平らな紙目)と質感を変えて、額の中だけ貼り込んだ台紙に見せる */}
      <img
        src={asset('wall/paper-crumpled.webp')} alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <OcPortrait
        tweaks={tweaks}
        size={`${renderSize}px`}
        style={{ position: 'absolute', left: '50%', bottom: BOTTOM_PUSH, transform: 'translateX(-50%)' }}
      />
    </div>
  );
}
