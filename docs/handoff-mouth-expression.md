# 交接：分层版「真口型 / 真眨眼」（See-through 差分接入）

> 接手请先读这份 + memory `oc-live-handoff.md`。本文件讲"接下来做什么、怎么接、坑在哪"。

## TL;DR — 现在要做的

管理员已用 **See-through 拆好 B（睁眼中口）的分层**。下一步：把 B 里的 **mouth 层（中口嘴形）** 接进分层版，做**真口型**（闭/中/开三态切换 + crossfade + 随机口パク，后续接音量驱动）。脚手架已就位（`oc-mouth.html` / `src/oc-mouth.jsx`），但**渲染方式要改**（见下方「关键」）。

第一件事：**问管理员 B 的 mouth 层文件在哪、叫什么、尺寸多少、是不是全画布同坐标**（项目里目前还没放进来）。

---

## ✅ 进展（2026-06-24）：闭/中 两态已接好并验证

- **素材来源**：管理员用 See-through 拆好整包 `~/Downloads/seethrough_output_B.psd`（1024×1024，13 层，命名与 `oc-layers` 完全对应）。其中 **`[7] mouth` = 中口层**（全画布同坐标），另有 **`[13] eyewhite` = 眼白层**（眨眼会用上，本次未碰）。
- **提取**：`magick "seethrough_output_B.psd[7]" -background none -define webp:lossless=true public/oc-layers/mouth_mid.webp`（~4KB）。原 PSD 不进项目。
- **接法**：`src/oc-mouth.jsx` 已改为**全画布层切换**——在 `mouth` 层 z 位置叠「闭口 `mouth.webp` + 中口 `mouth_mid.webp`」两张全画布同坐标图，按状态 opacity crossfade(70ms)，**对位滑杆已删**（同源同画布天然对齐，免调）。随机口パク改两态（閉⇄中）。开口(C)留了注释位 `MOUTH_LAYER = { 1:'mouth_mid' /*, 2:'mouth_open' */ }`，C 拆好改一行即可。
- **验证**：dev `/oc-mouth.html`，闭/中全景 + 嘴部特写（4.6×）均确认——中口干净「お」型张口、闭口平嘴线，**同位同源、边缘无缝、无 AI 差分杂边**；mouth 层外围那圈淡 alpha 弥散（实心嘴仅 27×26，外围 548×525 羽化）在脸上**不露馅**。控制台无报错。
- **已合进 oc-live（同日）**：`src/oc-live.jsx` 在 mouth 层 z 位置叠「闭口 `mouth.webp` + 中口 `mouth_mid.webp`」两张全画布图、opacity crossfade(70ms)，由新增 `mouth` state 驱动；新增「随机口型」动作开关（`talkOn`，默认关，逻辑同 oc-mouth 的两态口パク）到动作控制面板（眨眼↓挑眉↑）。mouth 在 `headPre`/head 组内，**自然跟随歪头/呼吸/体ゆれ/发摆**，无需手动按钮。dev 验证：闭口静默 → 开口パク中口张口(跟头一起动) → 关回闭口，均正常、无报错。`oc-mouth.html` 作为口型单测脚手架保留。
- **口型升级为「连续开口度」（同日，替掉两态 crossfade）**：管理员反馈两态 opacity 切换仍是「换图」、离散。改为**连续开口度参数**：闭口 `mouth.webp` 常驻当底，中口 `mouth_mid.webp` 用 `transform: scaleY(var(--mouth-open))`（支点 `transform-origin:48% 49%` 在嘴上沿）连续开合；`--mouth-open`(0..1) 由 rAF 平滑补间（**并进现有 gaze loop**，SMOOTH 0.35），随机口パク改成小刻度更新 `mouthTarget`（15% 概率闭合、否则 0.35–1，每 70–160ms）→ rAF 连续补间 → 连续起伏。**删掉 `mouth` state 与 `MOUTH_LAYER`**，口型完全脱离 React 重渲染（每帧只改 CSS 变量）。是 Live2D 嘴开合参数的极简版（纯前端、零新素材）。验证：冻结 `scaleY` 0.45/1.0 截图证明中间态连续存在；动态由管理员肉眼确认（注：`preview_eval` 读 CSS 变量恒空=工具上下文问题，非 bug）。**局限**：scaleY 仅纵向缩放近似，嘴角/口内不真变形，要真·形变须 Live2D/mesh。`mouthTarget` 已留作音量驱动接口。`oc-mouth.html` 仍是两态按钮脚手架（未跟进连续化，作单层素材单测用）。
- **下一步 roadmap**：① C 开口拆好 → 让 `--mouth-open` 0–1 跨「中口→开口」两段接力（或加大开口图）成三段连续；② `[13] eyewhite` + 闭眼层 → 真眨眼；③ ~~合进 `oc-live`~~ ✅；④ **接音量驱动**（麦克风/TTS 音量 → `mouthTarget`，参考 `src/talk-app.jsx` 的 sheet 版音量→口型）。

---

## 背景脉络（怎么走到这一步）

- 项目：`tomari-guruguru`，Vite + React 网页虚拟形象「いちご」。分支 `feat/oc-ichigo-live-layers`，dev：`npm run dev` → http://127.0.0.1:5173/
- 两套素材：
  - **差分 sheet**：25 方向 × 6 表情（A-F），`public/slices_oc/{A-F}/r{0-4}c{0-4}.webp`（1200×1200）。A=睁眼闭口 B=睁眼中口 C=睁眼开口 D=闭眼闭口 E=闭眼中口 F=闭眼开口。用在 `talk.html`(口型+追踪)、`guruguru.html`(追踪)。
  - **See-through 分层**：单张正面立绘拆 12 层，`public/oc-layers/*.webp`（1024 全画布透明）。用在 `oc-live.html`，纯 CSS 微动。
- **连续转头探索结论**（见 [`continuous-head-turn-research.md`](./continuous-head-turn-research.md)）：平面立绘连续转头**无捷径**——差分帧 + CSS transform 补间做不出（transform 改不了画中朝向，已验证）；真要连续转头只有「本地神经 THA（管理员有 RTX 5080）」或「学 Live2D」，都得正经投入。**转头暂搁置**，转攻性价比高的**表情维度**。
- 6 表情 A-F 与 See-through 分层**同源**（管理员确认），差异只在眼/嘴。所以补「中/开口的 mouth 层 + 闭眼的眼层」就能让分层版有**真口型 + 真眨眼**（替掉 oc-live 现在"压瞳孔"的假眨眼）。
- 上次我（前一对话）用 `magick` 椭圆羽化矩形从差分**粗抠贴片**——被管理员否决（靠同肤色侥幸融合的 hack、非真嘴形、易露馅）。**改用 See-through 拆干净语义层**。管理员已拆好 B。

---

## 当前代码状态

- **`oc-mouth.html` + `src/oc-mouth.jsx`**：口型验证脚手架。⚠️**现在是为"小贴片"写的**——有 `mouthX/mouthY/mouthScale` 对位滑杆 + `translate(-50%,-50%)` 居中小图，`MOUTH_SRC = {mid:'mouth_mid', open:'mouth_open'}`。它引用的 `mouth_mid.webp`/`mouth_open.webp` 是 magick 产物、**已删**，所以现在切「中/开」会图裂（`onError` 静默隐藏）。三态切换按钮 / 随机口パク / 呼吸 / crossfade(opacity 70ms) 逻辑都在、可复用。
- **`public/oc-layers/`**：干净的 12 层（1024 全画布 webp）：`back_hair, topwear, neck, ears, face, nose, mouth, eyebrow, irides, eyelash, front_hair, headwear`。`mouth.webp` = 闭口。
- **`src/oc-layers.js`**：`basePath:'oc-layers'`, `ext:'webp'`, `src(file) → oc-layers/{file}.webp`。`layers` 数组每项 `{id, file, group, ...}`，mouth 层 `group:'head'`，位于 nose 之后、eyebrow 之前。
- **未 commit**（`git status`）：`docs/continuous-head-turn-research.md`, `oc-mouth.html`, `oc-turn.html`, `src/oc-mouth.jsx`, `src/oc-turn.jsx`, `slices_peek.png`。oc-live 微表情那套已 commit（`af97163`）。
  - `oc-turn.*` = 转头 PoC（CSS-3D 逐层深度），转头搁置后未深入，可忽略/留存。
  - `slices_peek.png` 是调试残图，与代码无关，别 commit。

---

## ⚠️ 关键：See-through 全画布层 ≠ 上次的小贴片（接法必须变）

See-through 拆出的 mouth 层是**全画布 1024、同坐标的透明层**（和现有 `mouth.webp` 一模一样的画布）。因此：

- **不需要对位滑杆**——同源同画布，嘴的位置天然对齐。
- → 接入时要**简化 `oc-mouth.jsx` 的渲染**：丢掉 `mouthX/Y/scale` + `translate` 那套小贴片逻辑，改成「按口型状态渲染对应的**全画布** mouth 层（`position:absolute; inset:0; width/height:100%`）+ opacity crossfade」。三态切换 / 随机口パク / 呼吸 这些状态逻辑保留。

别沿用小贴片对位滑杆，那是为劣质粗抠写的、已作废。

---

## 接入步骤（第一步行动）

1. **确认素材**：问管理员 B 的 mouth 层文件路径、命名、尺寸（应 1024）、是否全画布同坐标（还是只含嘴的裁剪）。
2. **放素材**：放进 `public/oc-layers/`，建议命名 `mouth_mid.webp`（中口）。现有 `mouth.webp` = 闭口。
3. **改 `src/oc-mouth.jsx`**：mouth 层改全画布切换：
   - state 0 闭 → `mouth.webp`
   - state 1 中 → `mouth_mid.webp`
   - state 2 开 → `mouth_open.webp`（C 拆好后）
   - 渲染全画布 `<img>`、opacity crossfade、**删掉对位滑杆**。
   - 层序：中/开口层要盖在原闭口 `mouth` 之上，或三者互斥显示（同一时刻只亮一个）。
4. **验证**：`npm run dev` → `/oc-mouth.html`，看中口叠在现有脸上对不对齐（同源应天然齐）、嘴周边有没有缝 / AI 差分抖动的边缘。用 preview 工具截图确认。
5. C（开口）拆好后同样接 `mouth_open.webp` → 三态齐。

---

## 坑 / 注意

- **尺寸统一**：layers 是 1024，sheet 是 1200。B 若是对 1200 的 B 正视图拆的，要缩到 1024 对齐（`magick ... -resize 1024x1024`），否则叠不准。
- **AI 差分抖动**：A/B/C 是 AI 逐张生成的差分，脸/发有像素级漂移。理想情况是 **B 只取 mouth 层（嘴形 + 必要的口周），其余层全复用 A**——别整套替换（整套换会因像素抖动"抖"一下）。若 B 的 mouth 层带了下巴/皮肤且和 A 脸色有差，叠加可能露缝，看 See-through 抠得多干净，必要时只保留嘴本身。
- **`onError` 静默隐藏**：脚手架对缺图容错（`opacity=0`），别被它把"路径写错/图没放对"这种真问题悄悄吞了——接好后确认图真的显示了。
- **本机 webp 编码**：ffmpeg 无 libwebp，用 ImageMagick（`magick xxx.png xxx.webp` 或 `magick mogrify -format webp`）。

---

## 后续 roadmap

1. 口型三态（B 中 / C 开）接好 → **接音量驱动**（麦克风/TTS），参考 `src/talk-app.jsx` 现有口型逻辑（它在 sheet 版已做音量→口型）。
2. **闭眼**（D/E/F 拆眼层）→ 真眨眼，替掉 `oc-live.jsx` 现在压瞳孔的假眨眼。
3. **合进 oc-live**：看光标 + 挑眉 + 呼吸 + 发摆 + 身体摇摆，与真口型 / 真眨眼 一体。
4. 转头（连续）= 另案，结论见调研报告，暂不做。

---

## 相关文件 & memory

- [`docs/continuous-head-turn-research.md`](./continuous-head-turn-research.md) — 连续转头方案全调研（Live2D / Inochi2D / 神经 THA 三路线对比、为什么转头无捷径）
- memory `oc-live-handoff.md` — 关键文件 / 已知坑 / 本任务全程已验证结论（眨眼坑、sheet 补间死路、口型贴片验证、转头调研结论等）
- `src/oc-live.jsx`（已 commit 的微表情：看光标/眨眼/挑眉/呼吸/摆动）、`src/talk-app.jsx`（sheet 版口型 + 音量参考）、`src/app.jsx`（guruguru 追踪）
