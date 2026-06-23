// レイヤー設定 — See-through で分割した透明PNGを奥行き順に並べる
//
// public/oc-layers/ に各レイヤーPNG（全画布RGBA）を置き、下の layers を
// 実際のファイル名・奥行き順（先頭=一番奥, 末尾=一番手前）に書き換える。
//
// anim: そのレイヤーに割り当てる動き
//   'none'  動かさない
//   'hair'  髪の揺れ（クラウン付近を支点に左右へゆっくり回転）。amp=振幅倍率
//   'blink' まばたき（縦に潰す。瞳・まつ毛など目パーツに）
// phase: 同じ anim でも位相をずらして自然にする（秒）
//
// ※呼吸・bob はキャラ全体（コンテナ）にかかるのでレイヤー個別指定は不要。

export default {
  basePath: 'oc-layers',
  ext: 'webp',

  // 奥 → 手前（See-through出力の深度順）
  layers: [
    { id: 'back_hair',  file: 'back_hair',  anim: 'hair',  amp: 1.2, phase: 0.5 },
    { id: 'neck',       file: 'neck',       anim: 'none' },
    { id: 'topwear',    file: 'topwear',    anim: 'none' },
    { id: 'ears',       file: 'ears',       anim: 'none' },
    { id: 'face',       file: 'face',       anim: 'none' },
    { id: 'nose',       file: 'nose',       anim: 'none' },
    { id: 'mouth',      file: 'mouth',      anim: 'none' },
    { id: 'eyebrow',    file: 'eyebrow',    anim: 'none' },
    { id: 'irides',     file: 'irides',     anim: 'blink' },
    { id: 'eyelash',    file: 'eyelash',    anim: 'blink' },
    { id: 'front_hair', file: 'front_hair', anim: 'hair',  amp: 1.0, phase: 0 },
    { id: 'headwear',   file: 'headwear',   anim: 'hair',  amp: 0.5, phase: 0.15 },
  ],

  src(file) {
    return `${this.basePath}/${file}.${this.ext}`;
  },
};
