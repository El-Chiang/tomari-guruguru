import React from 'react';

const { useRef, useState, useEffect, useCallback } = React;

// 横スクロール帯の共通挙動: はみ出しがある側だけ端を fade させ、
// 縦ホイールは横スクロールに変換する（帯の上にポインタがあるときだけ）。
// CartridgeTimeline / ShelfSection で共用。
export default function useEdgeFade() {
  const ref = useRef(null);
  const [fade, setFade] = useState({ left: false, right: false });
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setFade((prev) => {
      const next = { left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 };
      return (next.left === prev.left && next.right === prev.right) ? prev : next;
    });
  }, []);
  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', update);
    };
  }, [update]);
  return { ref, fade, update };
}

// fade 状態 → mask-image の値（左右 48px のグラデーション）
export function edgeFadeMask(fade) {
  return `linear-gradient(to right, ${fade.left ? 'transparent 0, black 48px' : 'black 0'}, black calc(100% - 48px), ${fade.right ? 'transparent' : 'black'} 100%)`;
}
