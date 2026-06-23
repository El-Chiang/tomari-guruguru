import React from 'react';
import ReactDOM from 'react-dom/client';
import layerConfig from './oc-layers';

const { useMemo } = React;

const LIVE_DEFAULTS = /*EDITMODE-BEGIN*/{
  "charSize": 64,
  "bgColor": "#FFF8EE",
  "hairAmp": 2,
  "hairDur": 3.6,
  "breatheDur": 4,
  "breathe": true,
  "blink": false,
  "bob": true
}/*EDITMODE-END*/;

const BG_OPTIONS = ['#FFF8EE', '#FDEFEF', '#EEF4FB', '#2B2926'];

// anim名 → CSSクラス（呼吸はコンテナ側で処理するためここには無い）
const ANIM_CLASS = {
  hair: 'ly-hair',
  blink: 'ly-blink',
};

function App() {
  const [t, setTweak] = useTweaks(LIVE_DEFAULTS);

  const dark = t.bgColor === '#2B2926';
  const inkColor = dark ? 'rgba(255,248,238,0.85)' : 'rgba(60,48,38,0.8)';
  const subColor = dark ? 'rgba(255,248,238,0.45)' : 'rgba(60,48,38,0.45)';

  const sizeVmin = t.charSize * 4 / 3;
  const layers = layerConfig.layers;

  // 各animの有効/無効をtweaksで制御
  const animEnabled = (anim) => {
    if (anim === 'blink') return t.blink;
    return true; // hair は常時
  };

  // コンテナにCSS変数を流す（tweaksで上書き）
  const rootVars = {
    '--hair-amp': `${t.hairAmp}deg`,
    '--hair-dur': `${t.hairDur}s`,
    '--breathe-dur': `${t.breatheDur}s`,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: t.bgColor,
      overflow: 'hidden', transition: 'background 0.4s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Zen Maru Gothic', sans-serif", ...rootVars
    }}>
      <div className={t.bob ? 'bob' : ''} style={{
        position: 'relative',
        width: `${sizeVmin}vmin`, height: `${sizeVmin}vmin`,
        maxWidth: 1200, maxHeight: 1200,
        userSelect: 'none', touchAction: 'none'
      }}>
        <div className={t.breathe ? 'ly-breathe' : ''} style={{
          position: 'absolute', inset: 0
        }}>
          {layers.map((ly) => {
            const cls = animEnabled(ly.anim) ? (ANIM_CLASS[ly.anim] || '') : '';
            const style = {
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              pointerEvents: 'none',
              animationDelay: ly.phase ? `${-ly.phase}s` : undefined,
            };
            // 髪レイヤーごとの振幅倍率
            if (ly.anim === 'hair' && ly.amp != null) {
              style['--hair-amp'] = `calc(${t.hairAmp}deg * ${ly.amp})`;
            }
            return (
              <img key={ly.id} className={cls} src={layerConfig.src(ly.file)}
                alt="" draggable="false" style={style}
                onError={(e) => { e.currentTarget.style.opacity = 0; }}></img>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'absolute', top: '3.5vh', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 'clamp(18px, 2.4vmin, 26px)', fontWeight: 700, color: inkColor, letterSpacing: '0.18em' }}>トマリ ライブ</div>
        <div style={{ fontSize: 'clamp(12px, 1.6vmin, 16px)', color: subColor, marginTop: 4, letterSpacing: '0.08em' }}>レイヤー分割で髪揺れ・呼吸・まばたき</div>
      </div>

      <a href="talk.html" style={{
        position: 'absolute', top: 18, left: 18, fontSize: 13, fontWeight: 700,
        color: subColor, textDecoration: 'none', letterSpacing: '0.06em'
      }}>← トーク版</a>

      <TweaksPanel>
        <TweakSection label="髪の動き"></TweakSection>
        <TweakSlider label="揺れ幅" value={t.hairAmp} min={0} max={6} step={0.2} unit="°"
          onChange={(v) => setTweak('hairAmp', v)}></TweakSlider>
        <TweakSlider label="揺れの速さ" value={t.hairDur} min={1.5} max={8} step={0.1} unit="s"
          onChange={(v) => setTweak('hairDur', v)}></TweakSlider>
        <TweakSection label="その他の動き"></TweakSection>
        <TweakToggle label="呼吸" value={t.breathe}
          onChange={(v) => setTweak('breathe', v)}></TweakToggle>
        <TweakSlider label="呼吸の速さ" value={t.breatheDur} min={2} max={8} step={0.1} unit="s"
          onChange={(v) => setTweak('breatheDur', v)}></TweakSlider>
        <TweakToggle label="まばたき" value={t.blink}
          onChange={(v) => setTweak('blink', v)}></TweakToggle>
        <TweakToggle label="ふわふわ上下（bob）" value={t.bob}
          onChange={(v) => setTweak('bob', v)}></TweakToggle>
        <TweakSection label="見た目"></TweakSection>
        <TweakSlider label="キャラサイズ" value={t.charSize} min={30} max={92} unit="vmin"
          onChange={(v) => setTweak('charSize', v)}></TweakSlider>
        <TweakColor label="背景色" value={t.bgColor} options={BG_OPTIONS}
          onChange={(v) => setTweak('bgColor', v)}></TweakColor>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App></App>);
