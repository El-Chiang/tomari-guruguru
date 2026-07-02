import React from 'react';
import asset from './wall-asset';

// 元 ART TEXT（タイトル＋説明＋区切り線＋リンク行）を自己紹介用に転用。
// WallFrame の直下に流し込むので絶対配置はせず、幅だけ額に揃える。
const WIDTH = 340;

export default function WallFrameText({ content }) {
  return (
    <div style={{ width: WIDTH, marginTop: 16 }}>
      <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 24, lineHeight: 1.1, color: 'rgba(0,0,0,0.85)' }}>
        {content.name}
      </p>
      <p style={{ margin: '6px 0 0', fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 12, lineHeight: 1.4, color: 'rgba(0,0,0,0.45)' }}>
        {content.tagline}
      </p>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.15)', marginTop: 12 }} />
      <p style={{ margin: '12px 0 0', fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 10, lineHeight: 1.4, color: 'rgba(0,0,0,0.4)' }}>
        {content.bio}
      </p>
      {content.links.map((link) => (
        <a
          key={link.url} href={link.url} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, textDecoration: 'none' }}
        >
          <img src={asset('wall/icon-link.svg')} alt="" style={{ width: 10, height: 10 }} />
          <span style={{ fontFamily: "'IBM Plex Sans SC', sans-serif", fontSize: 10, color: 'rgba(0,0,0,0.55)' }}>
            {link.label}
          </span>
        </a>
      ))}
    </div>
  );
}
