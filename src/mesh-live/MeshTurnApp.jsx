import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import MeshCharacter from './MeshCharacter';
import {
  DEFAULT_SURFACE_SETTINGS,
  ICHIGO_LAYERS,
  ICHIGO_MODEL,
  PITCH_DOWN_LIMIT_DEG,
  PITCH_UP_LIMIT_DEG,
  ROLL_LIMIT_DEG,
  YAW_LIMIT_DEG,
} from './ichigo-model';
import { CharacterRig } from './character-rig';
import { DEFAULT_MOTION_SETTINGS } from './motion-controller';
import { clamp } from './parameter-controller';
import './mesh-turn.css';

const REFERENCE_LAYERS = [
  'back_hair', 'topwear', 'neck', 'ears', 'face', 'nose', 'mouth',
  'eyebrow', 'irides', 'eyelash', 'front_hair', 'headwear',
];

const POSE_ENDPOINTS = [
  { label: '↖', name: '抬头左转', yaw: -YAW_LIMIT_DEG, pitch: -1 },
  { label: '抬头', name: '抬头正面', yaw: 0, pitch: -1 },
  { label: '↗', name: '抬头右转', yaw: YAW_LIMIT_DEG, pitch: -1 },
  { label: '左转', name: '平视左转', yaw: -YAW_LIMIT_DEG, pitch: 0 },
  { label: '正面', name: '平视正面', yaw: 0, pitch: 0 },
  { label: '右转', name: '平视右转', yaw: YAW_LIMIT_DEG, pitch: 0 },
  { label: '↙', name: '低头左转', yaw: -YAW_LIMIT_DEG, pitch: 1 },
  { label: '低头', name: '低头正面', yaw: 0, pitch: 1 },
  { label: '↘', name: '低头右转', yaw: YAW_LIMIT_DEG, pitch: 1 },
];

function pitchToDegrees(value) {
  return value < 0 ? value * PITCH_UP_LIMIT_DEG : value * PITCH_DOWN_LIMIT_DEG;
}

function degreesToPitch(value) {
  return value < 0 ? value / PITCH_UP_LIMIT_DEG : value / PITCH_DOWN_LIMIT_DEG;
}

function ReferenceStack({ visible }) {
  return (
    <div className={`reference-stack${visible ? ' is-visible' : ''}`} aria-hidden="true">
      {REFERENCE_LAYERS.map((id) => (
        <img key={id} src={`${import.meta.env.BASE_URL}oc-layers/${id}.webp`} alt=""></img>
      ))}
    </div>
  );
}

function Range({ label, value, min, max, step, unit = '', onChange }) {
  return (
    <label className="range-row">
      <span>{label}</span>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={(event) => onChange(Number(event.target.value))}></input>
      <output>{Number(value).toFixed(step < 1 ? 2 : 0)}{unit}</output>
    </label>
  );
}

function Toggle({ children, active, onClick }) {
  return <button type="button" className={`toggle${active ? ' active' : ''}`} onClick={onClick}>{children}</button>;
}

function App() {
  const rig = useMemo(() => new CharacterRig(), []);
  const [mode, setMode] = useState('B');
  const [yawDeg, setYawDeg] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [rollDeg, setRollDeg] = useState(0);
  const [mouthManual, setMouthManual] = useState(0);
  const [pointerFollow, setPointerFollow] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [reference, setReference] = useState(false);
  const [ready, setReady] = useState(false);
  const [fps, setFps] = useState(0);
  const [surfaceSettings, setSurfaceSettings] = useState({ ...DEFAULT_SURFACE_SETTINGS });
  const [motionSettings, setMotionSettings] = useState({ ...DEFAULT_MOTION_SETTINGS });
  const stageRef = useRef(null);
  const meshRef = useRef(null);
  const pitchDeg = pitchToDegrees(pitch);

  const setSurface = useCallback((name, value) => {
    setSurfaceSettings((previous) => ({ ...previous, [name]: value }));
  }, []);

  const setMotion = useCallback((name, value) => {
    setMotionSettings((previous) => ({ ...previous, [name]: value }));
  }, []);

  useEffect(() => {
    rig.start((parameters) => meshRef.current?.updateParameters(parameters));
    return () => rig.stop();
  }, [rig]);

  useEffect(() => {
    rig.setMotionSettings(motionSettings);
  }, [rig, motionSettings]);

  useEffect(() => {
    rig.setPose({
      yaw: yawDeg / YAW_LIMIT_DEG,
      pitch,
      roll: rollDeg / ROLL_LIMIT_DEG,
      mouthOpen: mouthManual,
    });
  }, [rig, yawDeg, pitch, rollDeg, mouthManual]);

  useEffect(() => {
    if (!pointerFollow && !motionSettings.eyeFollow) return undefined;
    const onMove = (event) => {
      const pointer = CharacterRig.normalizePointer(event, stageRef.current);
      if (!pointer) return;
      rig.setPointer(pointer.x, pointer.y);
      if (pointerFollow) {
        // HeadPitch keeps the DOM direction (pointer down = nod down), so it
        // undoes the model-space Y inversion the gaze source needs.
        setYawDeg(pointer.x * YAW_LIMIT_DEG);
        setPitch(-pointer.y);
      }
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [rig, motionSettings.eyeFollow, pointerFollow]);

  const chooseYaw = (value) => {
    setPointerFollow(false);
    setYawDeg(value);
  };

  const choosePitchDegrees = (value) => {
    setPointerFollow(false);
    setPitch(clamp(degreesToPitch(value)));
  };

  const chooseRoll = (value) => {
    setMotion('autoRoll', false);
    setRollDeg(value);
  };

  const toggleAutoRoll = () => {
    const enabled = !motionSettings.autoRoll;
    if (enabled) setRollDeg(0);
    setMotion('autoRoll', enabled);
  };

  const chooseMouth = (value) => {
    setMotion('autoTalk', false);
    setMouthManual(value);
  };

  const toggleAutoTalk = () => {
    const enabled = !motionSettings.autoTalk;
    if (enabled) setMouthManual(0);
    setMotion('autoTalk', enabled);
  };

  const choosePose = (yaw, nextPitch) => {
    setPointerFollow(false);
    setYawDeg(yaw);
    setPitch(nextPitch);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ICHIGO / WEB MESH STUDY 01</p>
          <h1>2.5D 手工曲面转头</h1>
        </div>
        <div className="status-cluster">
          <span className={`status-dot${ready ? ' ready' : ''}`}></span>
          <span>{ready ? '模型已加载' : '正在加载纹理'}</span>
          <span className="fps">{fps ? `${fps} FPS` : '— FPS'}</span>
        </div>
      </header>

      <section className="workspace">
        <div className="viewport-card" ref={stageRef}>
          <div className="viewport-labels">
            <span>HEAD POSE</span>
            <div className="pose-readout">
              <strong>Y {yawDeg > 0 ? '+' : ''}{yawDeg.toFixed(1)}°</strong>
              <strong>X {pitchDeg > 0 ? '+' : ''}{pitchDeg.toFixed(1)}°</strong>
              <strong>Z {motionSettings.autoRoll
                ? `AUTO ±${(motionSettings.rollAmplitude * ROLL_LIMIT_DEG).toFixed(1)}°`
                : `${rollDeg > 0 ? '+' : ''}${rollDeg.toFixed(1)}°`}</strong>
            </div>
          </div>
          <div className="character-frame">
            <MeshCharacter ref={meshRef} model={ICHIGO_MODEL} mode={mode} wireframe={wireframe}
              surfaceSettings={surfaceSettings} onReady={() => setReady(true)} onStats={setFps}></MeshCharacter>
            <ReferenceStack visible={reference}></ReferenceStack>
          </div>
          <div className="axis-line"><i></i></div>
          <div className="endpoint-buttons pose-endpoints" aria-label="Head pose endpoints">
            {POSE_ENDPOINTS.map((endpoint) => (
              <button key={endpoint.name} type="button" title={endpoint.name}
                className={Math.abs(yawDeg - endpoint.yaw) < 0.01 && Math.abs(pitch - endpoint.pitch) < 0.01 ? 'active' : ''}
                onClick={() => choosePose(endpoint.yaw, endpoint.pitch)}>{endpoint.label}</button>
            ))}
          </div>
        </div>

        <aside className="control-panel">
          <section>
            <div className="section-title"><span>01</span><h2>原型比较</h2></div>
            <div className="segmented">
              <Toggle active={mode === 'A'} onClick={() => setMode('A')}>A · 数学曲面</Toggle>
              <Toggle active={mode === 'B'} onClick={() => setMode('B')}>B · 美术修正</Toggle>
            </div>
            <p className="hint">A 只有真实 Z 曲面和 X/Y 旋转；B 叠加脸型、远近眼、五官与发梢关键形。</p>
          </section>

          <section>
            <div className="section-title"><span>02</span><h2>转头参数</h2></div>
            <Range label="HeadYaw" value={yawDeg} min={-YAW_LIMIT_DEG} max={YAW_LIMIT_DEG}
              step={0.1} unit="°" onChange={chooseYaw}></Range>
            <Range label="HeadPitch" value={pitchDeg} min={-PITCH_UP_LIMIT_DEG} max={PITCH_DOWN_LIMIT_DEG}
              step={0.1} unit="°" onChange={choosePitchDegrees}></Range>
            <Range label="HeadRoll" value={rollDeg} min={-ROLL_LIMIT_DEG} max={ROLL_LIMIT_DEG}
              step={0.1} unit="°" onChange={chooseRoll}></Range>
            <div className="button-grid">
              <Toggle active={pointerFollow} onClick={() => setPointerFollow((value) => !value)}>头部跟随</Toggle>
              <Toggle active={wireframe} onClick={() => setWireframe((value) => !value)}>显示网格</Toggle>
              <Toggle active={reference} onClick={() => setReference((value) => !value)}>正面叠图</Toggle>
            </div>
          </section>

          <section>
            <div className="section-title"><span>03</span><h2>眼睛动作</h2></div>
            <div className="button-grid">
              <Toggle active={motionSettings.eyeFollow}
                onClick={() => setMotion('eyeFollow', !motionSettings.eyeFollow)}>眼球跟随</Toggle>
              <Toggle active={motionSettings.autoSaccade}
                onClick={() => setMotion('autoSaccade', !motionSettings.autoSaccade)}>随机扫视</Toggle>
              <Toggle active={motionSettings.autoBlink}
                onClick={() => setMotion('autoBlink', !motionSettings.autoBlink)}>自动眨眼</Toggle>
            </div>
            <Range label="眼球幅度" value={motionSettings.eyeAmplitude} min={0} max={1.5} step={0.05}
              onChange={(value) => setMotion('eyeAmplitude', value)}></Range>
            <Range label="扫视等待" value={motionSettings.idleDelay} min={0.4} max={4} step={0.1} unit="s"
              onChange={(value) => setMotion('idleDelay', value)}></Range>
            <button className="reset" type="button"
              onClick={() => rig.triggerBlink({ duration: 0.65 })}>眨眼测试</button>
            <p className="hint">鼠标移动时眼球优先跟随；静止后由随机扫视接管。眨眼会继续叠加在当前转头和点头姿态上。</p>
          </section>

          <section>
            <div className="section-title"><span>04</span><h2>歪头动作</h2></div>
            <div className="button-grid roll-controls">
              <Toggle active={motionSettings.autoRoll} onClick={toggleAutoRoll}>自动歪头</Toggle>
            </div>
            <Range label="摆动幅度" value={motionSettings.rollAmplitude * ROLL_LIMIT_DEG}
              min={0} max={ROLL_LIMIT_DEG} step={0.2} unit="°"
              onChange={(value) => setMotion('rollAmplitude', value / ROLL_LIMIT_DEG)}></Range>
            <Range label="摆动周期" value={motionSettings.rollDuration} min={2} max={9} step={0.1} unit="s"
              onChange={(value) => setMotion('rollDuration', value)}></Range>
            <p className="hint">默认沿用 guruguru 的 ±4° / 4s。歪头会叠加在当前转头、点头、眼球与眨眼动作上。</p>
          </section>

          <section>
            <div className="section-title"><span>05</span><h2>头发二级摆动</h2></div>
            <div className="button-grid roll-controls">
              <Toggle active={motionSettings.autoHair}
                onClick={() => setMotion('autoHair', !motionSettings.autoHair)}>自动摆动</Toggle>
            </div>
            <Range label="摆动幅度" value={motionSettings.hairAmplitude * 6}
              min={0} max={6} step={0.2} unit="°"
              onChange={(value) => setMotion('hairAmplitude', value / 6)}></Range>
            <Range label="摆动周期" value={motionSettings.hairDuration} min={1.5} max={8} step={0.1} unit="s"
              onChange={(value) => setMotion('hairDuration', value)}></Range>
            <p className="hint">前发、后发和发饰使用不同幅度与相位；发根保持稳定，发梢会对歪头产生轻微滞后。</p>
          </section>

          <section>
            <div className="section-title"><span>06</span><h2>口型</h2></div>
            <div className="button-grid roll-controls">
              <Toggle active={motionSettings.autoTalk} onClick={toggleAutoTalk}>随机口パク</Toggle>
            </div>
            <Range label="开口度" value={motionSettings.autoTalk ? 0 : mouthManual}
              min={0} max={1} step={0.01} onChange={chooseMouth}></Range>
            <p className="hint">闭口作底、中口网格向嘴上沿连续压缩，与 oc-live 的连续开口度同源。拖动滑杆会暂停随机口パク；目标值接口已预留给音量驱动。</p>
          </section>

          <section>
            <div className="section-title"><span>07</span><h2>手工曲面</h2></div>
            <Range label="脸部深度" value={surfaceSettings.faceDepth} min={0} max={100} step={1}
              onChange={(value) => setSurface('faceDepth', value)}></Range>
            <Range label="头发壳层" value={surfaceSettings.hairDepth} min={0} max={70} step={1}
              onChange={(value) => setSurface('hairDepth', value)}></Range>
            <Range label="立体投影" value={surfaceSettings.perspective} min={0} max={0.5} step={0.01}
              onChange={(value) => setSurface('perspective', value)}></Range>
            <Range label="端点修正" value={surfaceSettings.corrective} min={0} max={1.8} step={0.05}
              onChange={(value) => setSurface('corrective', value)}></Range>
            <Range label="点头修正" value={surfaceSettings.pitchCorrective} min={0} max={1.8} step={0.05}
              onChange={(value) => setSurface('pitchCorrective', value)}></Range>
            <button className="reset" type="button"
              onClick={() => setSurfaceSettings({ ...DEFAULT_SURFACE_SETTINGS })}>恢复默认曲面</button>
          </section>

          <footer>
            <span>{ICHIGO_LAYERS.length} layers</span>
            <span>1024² model space</span>
          </footer>
        </aside>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App></App>);
