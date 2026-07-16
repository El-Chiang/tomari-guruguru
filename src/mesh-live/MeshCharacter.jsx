import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { MeshCharacterRenderer } from './renderer';

const MeshCharacter = forwardRef(function MeshCharacter({
  mode,
  wireframe,
  surfaceSettings,
  onReady,
  onStats,
}, ref) {
  const hostRef = useRef(null);
  const rendererRef = useRef(null);
  const pendingParametersRef = useRef({});
  const propsRef = useRef({ mode, wireframe, surfaceSettings });
  propsRef.current = { mode, wireframe, surfaceSettings };

  useImperativeHandle(ref, () => ({
    updateParameters(parameters) {
      pendingParametersRef.current = parameters;
      rendererRef.current?.update(parameters);
    },
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const renderer = new MeshCharacterRenderer(host, { onStats });
    rendererRef.current = renderer;
    let alive = true;

    renderer.ready.then(() => {
      if (!alive) return;
      const latest = propsRef.current;
      renderer.setMode(latest.mode);
      renderer.setWireframe(latest.wireframe);
      renderer.setSurfaceSettings(latest.surfaceSettings);
      renderer.update(pendingParametersRef.current);
      onReady?.();
    });

    return () => {
      alive = false;
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => rendererRef.current?.setMode(mode), [mode]);
  useEffect(() => rendererRef.current?.setWireframe(wireframe), [wireframe]);
  useEffect(() => rendererRef.current?.setSurfaceSettings(surfaceSettings), [surfaceSettings]);

  return <div ref={hostRef} className="mesh-host" aria-label="2.5D character preview"></div>;
});

export default MeshCharacter;
