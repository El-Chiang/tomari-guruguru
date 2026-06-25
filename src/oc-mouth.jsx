import React from 'react';
import ReactDOM from 'react-dom/client';
import layerConfig from './oc-layers';

const { useState, useEffect } = React;

const MOUTH_DEFAULTS = /*EDITMODE-BEGIN*/{
  "charSize": 64,
  "bgColor": "#FFF8EE",
  "autoTalk": false,
  "breatheOn": true
}/*EDITMODE-END*/;

const BG_OPTIONS = ['#FFF8EE', '#FDEFEF', '#EEF4FB', '#2B2926'];

// See-through で分割した全画布の口レイヤー（現有 mouth=閉口と同座標・同サイズ）
//   閉口(0) … 既存の mouth.webp
//   中口(1) … mouth_mid.webp
//   ※開口(2)=mouth_open は C を拆いたら src を足すだけ
const MOUTH_LAYER = { 1: 'mouth_mid' /*, 2: 'mouth_open' */ };
const FILL = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' };

function App() {
  const [t, setTweak] = useTweaks(MOUTH_DEFAULTS);
  const [mouth, setMouth] = useState(0); // 0 閉 / 1 中

  // ランダム口パク（マイク無しのデモ）— 2態（閉⇄中）
  useEffect(() => {
    if (!t.autoTalk) { setMouth(0); return; }
    let alive = true, timer;
    const rand = (a, b) => a + Math.random() * (b - a);
    function step() {
      if (!alive) return;
      if (Math.random() < 0.18) {
        setMouth(0); timer = setTimeout(step, rand(500, 1300));
      } else {
        setMouth(1);
        timer = setTimeout(() => {
          if (!alive) return;
          setMouth(0); timer = setTimeout(step, rand(90, 200));
        }, rand(160, 360));
      }
    }
    step();
    return () => { alive = false; clearTimeout(timer); setMouth(0); };
  }, [t.autoTalk]);

  const dark = t.bgColor === '#2B2926';
  const ink = dark ? 'rgba(255,248,238,0.85)' : 'rgba(60,48,38,0.82)';
  const sub = dark ? 'rgba(255,248,238,0.45)' : 'rgba(60,48,38,0.45)';
  const sizeVmin = t.charSize * 4 / 3;
  const layers = layerConfig.layers;

  // 全画布の口レイヤー（同座標）。閉口は既存 mouth、中口/開口は state で crossfade。
  const mouthStack = (key) => {
    const closedOn = mouth === 0;
    return (
      <React.Fragment key={key}>
        <img src={layerConfig.src('mouth')} alt="" draggable="false"
          style={{ ...FILL, opacity: closedOn ? 1 : 0, transition: 'opacity 70ms linear' }}
          onError={(e) => { e.currentTarget.style.opacity = 0; }}></img>
        {Object.entries(MOUTH_LAYER).map(([v, file]) => (
          <img key={file} src={layerConfig.src(file)} alt="" draggable="false"
            style={{ ...FILL, opacity: mouth === Number(v) ? 1 : 0, transition: 'opacity 70ms linear' }}
            onError={(e) => { e.currentTarget.style.opacity = 0; }}></img>
        ))}
      </React.Fragment>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: t.bgColor, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Zen Maru Gothic', sans-serif", transition: 'background 0.4s ease',
    }}>
      <div className={t.breatheOn ? 'breathe' : ''} style={{
        position: 'relative', width: `${sizeVmin}vmin`, height: `${sizeVmin}vmin`,
        maxWidth: 1200, maxHeight: 1200, userSelect: 'none',
      }}>
        {layers.map((ly) => (
          // 口レイヤーの位置で、閉口/中口を全画布で重ねて切替（z順は元のまま）
          ly.id === 'mouth' ? mouthStack(ly.id) : (
            <img key={ly.id} src={layerConfig.src(ly.file)} alt="" draggable="false"
              style={FILL}
              onError={(e) => { e.currentTarget.style.opacity = 0; }}></img>
          )
        ))}
      </div>

      <div style={{ position: 'absolute', top: '3.5vh', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 'clamp(18px,2.4vmin,26px)', fontWeight: 700, color: ink, letterSpacing: '0.12em' }}>真口型（閉/中）</div>
        <div style={{ fontSize: 'clamp(12px,1.6vmin,16px)', color: sub, marginTop: 4, letterSpacing: '0.04em' }}>See-through 分層・全画布レイヤー切替</div>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10 }}>
        {[['閉', 0], ['中', 1]].map(([lbl, v]) => (
          <button key={v} onClick={() => { setTweak('autoTalk', false); setMouth(v); }} style={{
            font: 'inherit', fontWeight: 700, fontSize: 14, padding: '9px 18px', borderRadius: 12,
            border: `1.5px solid ${mouth === v ? '#D96C4F' : 'rgba(60,48,38,0.2)'}`,
            background: mouth === v ? '#D96C4F' : 'transparent', color: mouth === v ? '#fff' : ink, cursor: 'pointer',
          }}>{lbl}</button>
        ))}
      </div>

      <a href="oc-live.html" style={{ position: 'absolute', top: 18, left: 18, fontSize: 13, fontWeight: 700, color: sub, textDecoration: 'none', letterSpacing: '0.04em' }}>← Live版</a>

      <TweaksPanel>
        <TweakSection label="動作"></TweakSection>
        <TweakToggle label="ランダム口パク" value={t.autoTalk} onChange={(v) => setTweak('autoTalk', v)}></TweakToggle>
        <TweakToggle label="呼吸" value={t.breatheOn} onChange={(v) => setTweak('breatheOn', v)}></TweakToggle>
        <TweakSection label="見た目"></TweakSection>
        <TweakSlider label="サイズ" value={t.charSize} min={30} max={92} unit="vmin" onChange={(v) => setTweak('charSize', v)}></TweakSlider>
        <TweakColor label="背景色" value={t.bgColor} options={BG_OPTIONS} onChange={(v) => setTweak('bgColor', v)}></TweakColor>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App></App>);
