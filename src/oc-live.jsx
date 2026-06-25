import React from 'react';
import ReactDOM from 'react-dom/client';
import layerConfig from './oc-layers';

const { useState, useEffect, useRef } = React;

const LIVE_DEFAULTS = /*EDITMODE-BEGIN*/{
  "charSize": 64,
  "bgColor": "#FFF8EE",
  "hairOn": true,    "hairAmp": 2,    "hairDur": 3.6,
  "breatheOn": true, "breatheDur": 4,
  "bobOn": true,
  "tiltOn": true,    "tiltAmp": 2.5,  "tiltDur": 5,
  "swayOn": false,   "swayAmp": 1.5,  "swayDur": 6,
  "eyeOn": true,     "eyeAmp": 4,
  "blinkOn": true,
  "browOn": true,    "browAmp": 1.2,  "browDur": 7,
  "talkOn": false
}/*EDITMODE-END*/;

const BG_OPTIONS = ['#FFF8EE', '#FDEFEF', '#EEF4FB', '#2B2926'];

// 口型: 閉口 mouth.webp を底に、中口 mouth_mid.webp を scaleY で連続的に開閉する。
// 開口度 --mouth-open(0..1) を rAF で平滑駆動 ＝ 離散切替でなく連続変形（Live2D の
// 口開閉パラメータの簡易版）。支点を口の上端に置き、下方向へ開く。
const MOUTH_MID = 'mouth_mid';
const MOUTH_ORIGIN = '48% 49%';

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

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
  const [blink, setBlink] = useState(false);

  const stageRef = useRef(null);   // CSS変数(--gaze-x/y, --mouth-open)を流す先
  const charRef = useRef(null);    // 視線の中心を測る基準
  const gazeBase = useRef({ x: 0, y: 0 });  // マウス由来
  const gazeSac = useRef({ x: 0, y: 0 });   // サッケード(瞳の揺らぎ)
  const gazeCur = useRef({ x: 0, y: 0 });   // 平滑後の現在値
  const mouthOpen = useRef(0);    // 開口度: 平滑後の現在値(0..1)
  const mouthTarget = useRef(0);  // 開口度: 目標値（口パク/音量がここに書く）
  const tRef = useRef(t);
  tRef.current = t;

  // マウス追従: キャラ中心からの相対位置を -1..1 に正規化
  useEffect(() => {
    function onMove(e) {
      if (!tRef.current.eyeOn) return;
      const el = charRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.42;
      const range = Math.max(rect.width, 1) * 0.9;
      gazeBase.current.x = clamp((e.clientX - cx) / range, -1, 1);
      gazeBase.current.y = clamp((e.clientY - cy) / range, -1, 1);
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // 視線ループ: マウス + サッケードを平滑して --gaze-x/y に書く
  useEffect(() => {
    let raf;
    const SMOOTH = 0.16;
    function tick() {
      const on = tRef.current.eyeOn;
      const dx = on ? clamp(gazeBase.current.x + gazeSac.current.x, -1, 1) : 0;
      const dy = on ? clamp(gazeBase.current.y + gazeSac.current.y, -1, 1) : 0;
      gazeCur.current.x += (dx - gazeCur.current.x) * SMOOTH;
      gazeCur.current.y += (dy - gazeCur.current.y) * SMOOTH;
      // 口の開口度を目標値へ平滑補間（説話/口パクの連続的な開閉）
      mouthOpen.current += (mouthTarget.current - mouthOpen.current) * 0.35;
      const el = stageRef.current;
      if (el) {
        el.style.setProperty('--gaze-x', gazeCur.current.x.toFixed(4));
        el.style.setProperty('--gaze-y', gazeCur.current.y.toFixed(4));
        el.style.setProperty('--mouth-open', mouthOpen.current.toFixed(4));
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // サッケード: たまに瞳をピッと逸らして戻す（マウス追従に上乗せ）
  useEffect(() => {
    let alive = true;
    let timer;
    const rand = (a, b) => a + Math.random() * (b - a);
    function flick() {
      if (!alive) return;
      gazeSac.current.x = rand(-0.4, 0.4);
      gazeSac.current.y = rand(-0.25, 0.25);
      timer = setTimeout(() => {
        if (!alive) return;
        gazeSac.current.x = 0;
        gazeSac.current.y = 0;
        schedule();
      }, rand(450, 900));
    }
    function schedule() {
      if (!alive) return;
      timer = setTimeout(flick, rand(1200, 4000));
    }
    schedule();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  // 自動まばたき（自然なゆらぎ: 不規則な間隔 + 二度瞬き + ゆっくり瞬き）
  useEffect(() => {
    if (!t.blinkOn) { setBlink(false); return; }
    let alive = true;
    let timer;
    const rand = (a, b) => a + Math.random() * (b - a);
    function blinkOnce(dur, after) {
      setBlink(true);
      timer = setTimeout(() => {
        if (!alive) return;
        setBlink(false);
        timer = setTimeout(after, rand(120, 220));
      }, dur);
    }
    function doBlink() {
      if (!alive) return;
      const roll = Math.random();
      if (roll < 0.22) {
        blinkOnce(rand(80, 120), () => { if (alive) blinkOnce(rand(70, 110), schedule); });
      } else if (roll < 0.28) {
        blinkOnce(rand(260, 420), schedule);
      } else {
        blinkOnce(rand(90, 150), schedule);
      }
    }
    function schedule() {
      if (!alive) return;
      const u = Math.random();
      let wait;
      if (u < 0.12) wait = rand(700, 1500);
      else if (u < 0.82) wait = rand(1800, 4500);
      else wait = rand(4500, 9000);
      timer = setTimeout(doBlink, wait);
    }
    schedule();
    return () => { alive = false; clearTimeout(timer); };
  }, [t.blinkOn]);

  // ランダム口パク（デモ用）。開口度の「目標値」を小刻みに更新するだけ。
  // 実際の開閉は rAF が目標へ連続補間するので、切替ではなく滑らかに動く。
  // 後でマイク/TTS の音量を mouthTarget に流せば「喋りに合わせて」連続開閉できる。
  useEffect(() => {
    if (!t.talkOn) { mouthTarget.current = 0; return; }
    let alive = true, timer;
    const rand = (a, b) => a + Math.random() * (b - a);
    function step() {
      if (!alive) return;
      // たまに閉じて「間」を作り、それ以外は様々な開き具合に
      mouthTarget.current = Math.random() < 0.15 ? 0 : rand(0.35, 1);
      timer = setTimeout(step, rand(70, 160));
    }
    step();
    return () => { alive = false; clearTimeout(timer); mouthTarget.current = 0; };
  }, [t.talkOn]);

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
    // 視線: 瞳の可動量のみ（頭は回さない＝前髪が動かない）
    '--eye-amp-x': `${(t.eyeAmp * 0.16).toFixed(3)}%`,
    '--eye-amp-y': `${(t.eyeAmp * 0.10).toFixed(3)}%`,
    '--brow-amp': `${(t.browAmp * 0.55).toFixed(3)}%`, '--brow-dur': `${t.browDur}s`,
  };

  const renderImg = (ly) => {
    // 口: 閉口/中口を全画布同座標で重ね、口パク state で opacity crossfade
    // （head グループ内なので首かしげ・呼吸・体ゆれに自然に追従する）
    if (ly.id === 'mouth') {
      const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' };
      return (
        <React.Fragment key={ly.id}>
          {/* 閉口を底に常駐 */}
          <img src={layerConfig.src('mouth')} alt="" draggable="false" style={fill}
            onError={(e) => { e.currentTarget.style.opacity = 0; }}></img>
          {/* 中口を上端支点で scaleY 連続開閉（--mouth-open 0..1 を rAF が駆動） */}
          <img src={layerConfig.src(MOUTH_MID)} alt="" draggable="false"
            style={{ ...fill, transformOrigin: MOUTH_ORIGIN, transform: 'scaleY(var(--mouth-open, 0))', willChange: 'transform' }}
            onError={(e) => { e.currentTarget.style.opacity = 0; }}></img>
        </React.Fragment>
      );
    }
    const style = {
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none',
    };
    let cls = '';
    if (ly.hair && t.hairOn) {
      cls = 'ly-hair';
      style['--hair-amp'] = `calc(${t.hairAmp}deg * ${ly.hair.amp ?? 1})`;
      if (ly.hair.phase) style.animationDelay = `${-ly.hair.phase}s`;
    } else if (ly.brow && t.browOn) {
      cls = 'ly-brow';
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

  // 目: 瞳(eyemove)だけマウス方向へ、まつ毛は固定。まばたきは目グループ全体を縦に潰す
  const eyeNode = eyes.length ? (
    <div key="eyes" className={`ly-eyes${blink ? ' blinking' : ''}`} style={{ position: 'absolute', inset: 0 }}>
      {eyes.map((ly) => ly.eyemove
        ? wrap(t.eyeOn, 'ly-eyemove', renderImg(ly), `em-${ly.id}`)
        : renderImg(ly))}
    </div>
  ) : null;

  // 頭部: 首かしげ(tilt)で前髪・顔・目をまとめて傾けるだけ。
  // ※「看向光标」は瞳のみ動かす。頭ごと向けると前髪まで動いて不自然なので頭は回さない。
  const headNode = wrap(t.tiltOn, 'ly-tilt',
    [...headPre.map(renderImg), eyeNode, ...headPost.map(renderImg)], 'head');

  // 後ろ髪: 頭と同期した tilt を別途かけて頭に追従させつつ、z順は奥のまま
  const backHairNode = wrap(t.tiltOn, 'ly-tilt', backhair.map(renderImg), 'backhair-tilt');

  return (
    <div ref={stageRef} style={{
      position: 'fixed', inset: 0, background: t.bgColor,
      overflow: 'hidden', transition: 'background 0.4s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Zen Maru Gothic', sans-serif", ...rootVars
    }}>
      <div ref={charRef} className={t.bobOn ? 'bob' : ''} style={{
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
    { key: 'eye',     label: '看向光标', amp: ['eyeAmp', 0, 10, 0.5, ''] },
    { key: 'blink',   label: '眨眼' },
    { key: 'talk',    label: '随机口型' },
    { key: 'brow',    label: '挑眉',     amp: ['browAmp', 0, 3, 0.1, ''],  dur: ['browDur', 3, 12, 0.5] },
    { key: 'hair',    label: '头发摆动', amp: ['hairAmp', 0, 6, 0.2, '°'], dur: ['hairDur', 1.5, 8, 0.1] },
    { key: 'tilt',    label: '歪头',     amp: ['tiltAmp', 0, 6, 0.2, '°'], dur: ['tiltDur', 2, 9, 0.1] },
    { key: 'sway',    label: '身体摇摆', amp: ['swayAmp', 0, 5, 0.2, '°'], dur: ['swayDur', 3, 10, 0.1] },
    { key: 'breathe', label: '呼吸',     dur: ['breatheDur', 2, 8, 0.1] },
    { key: 'bob',     label: '上下浮动' },
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
