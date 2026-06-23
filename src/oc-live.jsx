import React from 'react';
import ReactDOM from 'react-dom/client';
import layerConfig from './oc-layers';

const { useState } = React;

const LIVE_DEFAULTS = /*EDITMODE-BEGIN*/{
  "charSize": 64,
  "bgColor": "#FFF8EE",
  "hairOn": true,    "hairAmp": 2,    "hairDur": 3.6,
  "breatheOn": true, "breatheDur": 4,
  "bobOn": true,
  "tiltOn": true,    "tiltAmp": 2.5,  "tiltDur": 5,
  "swayOn": false,   "swayAmp": 1.5,  "swayDur": 6,
  "eyeOn": true,     "eyeAmp": 4,     "eyeDur": 5,
  "blinkOn": false,  "blinkDur": 5.5
}/*EDITMODE-END*/;

const BG_OPTIONS = ['#FFF8EE', '#FDEFEF', '#EEF4FB', '#2B2926'];

// レイヤーをグループに振り分け（奥行き順を保持）
function bucketize(layers) {
  const backhair = [], body = [], headPre = [], eyes = [], headPost = [];
  let seenEye = false;
  for (const ly of layers) {
    if (ly.group === 'backhair') backhair.push(ly);
    else if (ly.group === 'body') body.push(ly);
    else if (ly.group === 'eyes') { eyes.push(ly); seenEye = true; }
    else (seenEye ? headPost : headPre).push(ly);
  }
  return { backhair, body, headPre, eyes, headPost };
}

function App() {
  const [t, setTweak] = useTweaks(LIVE_DEFAULTS);
  const [panelOpen, setPanelOpen] = useState(true);

  const dark = t.bgColor === '#2B2926';
  const inkColor = dark ? 'rgba(255,248,238,0.85)' : 'rgba(60,48,38,0.82)';
  const subColor = dark ? 'rgba(255,248,238,0.45)' : 'rgba(60,48,38,0.45)';
  const panelBg = dark ? 'rgba(48,45,42,0.92)' : 'rgba(255,255,255,0.9)';
  const lineColor = dark ? 'rgba(255,248,238,0.14)' : 'rgba(60,48,38,0.12)';

  const sizeVmin = t.charSize * 4 / 3;
  const { backhair, body, headPre, eyes, headPost } = bucketize(layerConfig.layers);

  // CSS変数（強さ・速さをコンテナに流す）
  const rootVars = {
    '--hair-dur': `${t.hairDur}s`,
    '--breathe-dur': `${t.breatheDur}s`,
    '--tilt-amp': `${t.tiltAmp}deg`,    '--tilt-dur': `${t.tiltDur}s`,
    '--sway-amp': `${t.swayAmp}deg`,    '--sway-dur': `${t.swayDur}s`,
    '--eye-amp': `${t.eyeAmp * 0.15}%`, '--eye-dur': `${t.eyeDur}s`,
    '--blink-dur': `${t.blinkDur}s`,
  };

  const renderImg = (ly) => {
    const isHair = !!ly.hair;
    const style = {
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none',
    };
    let cls = '';
    if (isHair && t.hairOn) {
      cls = 'ly-hair';
      style['--hair-amp'] = `calc(${t.hairAmp}deg * ${ly.hair.amp ?? 1})`;
      if (ly.hair.phase) style.animationDelay = `${-ly.hair.phase}s`;
    }
    return (
      <img key={ly.id} className={cls} src={layerConfig.src(ly.file)}
        alt="" draggable="false" style={style}
        onError={(e) => { e.currentTarget.style.opacity = 0; }}></img>
    );
  };

  const wrap = (on, cls, children, key) => (
    <div key={key} className={on ? cls : ''} style={{ position: 'absolute', inset: 0 }}>{children}</div>
  );

  // 目: 瞳(eyemove)だけ動かし、まつ毛は固定。まばたきは目グループ全体に
  const eyeNode = eyes.length
    ? wrap(t.blinkOn, 'ly-blink',
        eyes.map((ly) => ly.eyemove
          ? wrap(t.eyeOn, 'ly-eyemove', renderImg(ly), `em-${ly.id}`)
          : renderImg(ly)),
        'blink')
    : null;

  // 頭部: 首かしげ(tilt)で前髪・顔・目をまとめて傾ける
  const headNode = wrap(t.tiltOn, 'ly-tilt',
    [...headPre.map(renderImg), eyeNode, ...headPost.map(renderImg)], 'head');

  // 後ろ髪: 頭と同期した tilt を別途かけて頭に追従させつつ、z順は奥のまま
  const backHairNode = wrap(t.tiltOn, 'ly-tilt', backhair.map(renderImg), 'backhair-tilt');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: t.bgColor,
      overflow: 'hidden', transition: 'background 0.4s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Zen Maru Gothic', sans-serif", ...rootVars
    }}>
      <div className={t.bobOn ? 'bob' : ''} style={{
        position: 'relative',
        width: `${sizeVmin}vmin`, height: `${sizeVmin}vmin`,
        maxWidth: 1200, maxHeight: 1200,
        userSelect: 'none', touchAction: 'none'
      }}>
        {/* 呼吸 > 体ゆれ > (後ろ髪[頭同期傾き] + 体 + 頭部) */}
        {wrap(t.breatheOn, 'ly-breathe',
          wrap(t.swayOn, 'ly-sway',
            [backHairNode, ...body.map(renderImg), headNode], 'sway'),
          'breathe')}
      </div>

      <div style={{ position: 'absolute', top: '3.5vh', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 'clamp(18px, 2.4vmin, 26px)', fontWeight: 700, color: inkColor, letterSpacing: '0.12em' }}>立绘 Live</div>
        <div style={{ fontSize: 'clamp(12px, 1.6vmin, 16px)', color: subColor, marginTop: 4, letterSpacing: '0.04em' }}>分层拆分，让立绘轻轻动起来</div>
      </div>

      <a href="talk.html" style={{
        position: 'absolute', top: 18, left: 18, fontSize: 13, fontWeight: 700,
        color: subColor, textDecoration: 'none', letterSpacing: '0.04em'
      }}>← 口型版</a>

      <MotionPanel t={t} setTweak={setTweak} open={panelOpen} setOpen={setPanelOpen}
        colors={{ inkColor, subColor, panelBg, lineColor }}></MotionPanel>

      {/* 外观设置放在齿轮面板 */}
      <TweaksPanel>
        <TweakSection label="外观"></TweakSection>
        <TweakSlider label="角色大小" value={t.charSize} min={30} max={92} unit="vmin"
          onChange={(v) => setTweak('charSize', v)}></TweakSlider>
        <TweakColor label="背景色" value={t.bgColor} options={BG_OPTIONS}
          onChange={(v) => setTweak('bgColor', v)}></TweakColor>
      </TweaksPanel>
    </div>
  );
}

// ───────── 常驻「动作控制」面板 ─────────
function MotionPanel({ t, setTweak, open, setOpen, colors }) {
  const { inkColor, subColor, panelBg, lineColor } = colors;

  const MOTIONS = [
    { key: 'hair',    label: '头发摆动', amp: ['hairAmp', 0, 6, 0.2, '°'], dur: ['hairDur', 1.5, 8, 0.1] },
    { key: 'tilt',    label: '歪头',     amp: ['tiltAmp', 0, 6, 0.2, '°'], dur: ['tiltDur', 2, 9, 0.1] },
    { key: 'sway',    label: '身体摇摆', amp: ['swayAmp', 0, 5, 0.2, '°'], dur: ['swayDur', 3, 10, 0.1] },
    { key: 'eye',     label: '眼神',     amp: ['eyeAmp', 0, 10, 0.5, ''],  dur: ['eyeDur', 2, 9, 0.1] },
    { key: 'breathe', label: '呼吸',     dur: ['breatheDur', 2, 8, 0.1] },
    { key: 'bob',     label: '上下浮动' },
    { key: 'blink',   label: '眨眼（简易）', dur: ['blinkDur', 2, 9, 0.1] },
  ];

  return (
    <div style={{
      position: 'fixed', top: 64, left: 16, zIndex: 2147483645,
      width: 250, background: panelBg, backdropFilter: 'blur(12px)',
      border: `1px solid ${lineColor}`, borderRadius: 16,
      boxShadow: '0 8px 28px rgba(60,48,38,0.14)', overflow: 'hidden',
      fontFamily: "'Zen Maru Gothic', sans-serif"
    }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', boxSizing: 'border-box', padding: '11px 14px',
        background: 'transparent', border: 0, cursor: 'pointer',
        font: 'inherit', fontWeight: 700, fontSize: 14, color: inkColor
      }}>
        <span>🎬 动作控制</span>
        <span style={{ color: subColor, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
      </button>

      {open ? (
        <div style={{ padding: '2px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOTIONS.map((m) => {
            const onKey = `${m.key}On`;
            const on = !!t[onKey];
            return (
              <div key={m.key} style={{
                borderTop: `1px solid ${lineColor}`, paddingTop: 9,
                opacity: on ? 1 : 0.55, transition: 'opacity .15s'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13.5, color: inkColor }}>
                  <input type="checkbox" checked={on} onChange={(e) => setTweak(onKey, e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: '#D96C4F', cursor: 'pointer' }}></input>
                  {m.label}
                </label>
                {(m.amp || m.dur) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, paddingLeft: 23 }}>
                    {m.amp ? <Slider t={t} setTweak={setTweak} name="强度" cfg={m.amp} disabled={!on} sub={subColor}></Slider> : null}
                    {m.dur ? <Slider t={t} setTweak={setTweak} name="速度" cfg={m.dur} disabled={!on} sub={subColor} invert></Slider> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Slider({ t, setTweak, name, cfg, disabled, sub, invert }) {
  const [key, min, max, step, unit = ''] = cfg;
  const v = t[key];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: sub, width: 28, flexShrink: 0 }}>{name}</span>
      <input type="range" min={min} max={max} step={step} value={v} disabled={disabled}
        onChange={(e) => setTweak(key, parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#D96C4F', cursor: disabled ? 'default' : 'pointer' }}></input>
      <span style={{ fontSize: 11, color: sub, width: 32, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {invert ? `${v}s` : `${v}${unit}`}
      </span>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App></App>);
