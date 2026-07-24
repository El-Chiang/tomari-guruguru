// Wall ページの静的コンテンツ設定。character-config.js / oc-layers.js と同じ
// 「データとレンダリングを分離する」方針 — 内容を変えたいときはここだけ編集する。
// Steam のプレイ実績は手動スナップショット（Obsidian vault の 2026 游戏时间线.md /
// steam_games.json から転記）で、実行時に Steam Web API を叩くことはしない
// （静的サイトなので key を隠すプロキシが立てられず、そもそもこのページに
// リアルタイム性は不要なため）。
//
// カバー画像の入手先（wall/covers/ に保存済み）:
//   縦版 https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg
//   横版(新作はハッシュ付きパスなので appdetails API 経由で取得)

const steamUrl = (appid) => `https://store.steampowered.com/app/${appid}`;

export default {
  profile: {
    name: 'yiyi',
    tagline: '私はもう十分可愛いもの、これ以上は世界が危険よ',
    bio: 'マウスを動かすと こっちを見る。放っておくと ひとりで過ごすよ。',
    links: [
      // Steam プロフィールへのリンクは一旦非表示（あとで戻すかも）
      // { label: 'Steam ↗', url: 'https://steamcommunity.com/profiles/76561198325807650' },
    ],
    steamUrl: 'https://steamcommunity.com/profiles/76561198325807650',
  },

  // 木棚（最近遊んでいる 5 本）: Steam クライアントの「最近」タブの並び順のまま。
  shelf: [
    { appid: 1256670, name: 'Library Of Ruina', cover: 'wall/covers/1256670_vertical.jpg', hours: 102.6, note: '直近2週間で74.1h', url: steamUrl(1256670) },
    { appid: 2445690, name: '失落城堡2', cover: 'wall/covers/2445690_vertical.jpg', hours: 40.4, url: steamUrl(2445690) },
    { appid: 3357650, name: 'PRAGMATA', cover: 'wall/covers/3357650_vertical.jpg', hours: 1.9, note: '未発売', url: steamUrl(3357650) },
    { appid: 2868840, name: 'Slay the Spire 2', cover: 'wall/covers/2868840_vertical.jpg', hours: 204.3, url: steamUrl(2868840) },
    { appid: 2863680, name: '归零巡礼：亡谍镇魂曲', cover: 'wall/covers/2863680_vertical.jpg', hours: 36.5, url: steamUrl(2863680) },
    { appid: 3974650, name: '鬼武者 Way of the Sword DEMO', cover: 'wall/covers/3974650_vertical.jpg', hours: 1.1, note: '体験版', url: steamUrl(3974650) },
  ],

  // カセット時間軸: 月ごとのクラスタ。cover はカセットのラベル窓に貼るので
  // 縦横比は問わない（object-fit: cover でクロップ）。
  timeline: [
    {
      month: '1月',
      games: [
        { appid: 568220, name: 'Lobotomy Corporation', cover: 'wall/covers/568220_vertical.jpg', url: steamUrl(568220) },
        { appid: 3167020, name: '逃离鸭科夫', cover: 'wall/covers/3167020_vertical.jpg', url: steamUrl(3167020) },
      ],
    },
    {
      month: '3月',
      games: [
        { appid: 2285550, name: '多洛可小镇', cover: 'wall/covers/2285550_vertical.jpg', hours: 135.7, url: steamUrl(2285550) },
      ],
    },
    {
      month: '4月',
      games: [
        { appid: 1588550, name: '孤山独影', cover: 'wall/covers/1588550_vertical.jpg', url: steamUrl(1588550) },
        { appid: 3265700, name: '吸血鬼爬行者', cover: 'wall/covers/3265700_header.jpg', url: steamUrl(3265700) },
      ],
    },
    {
      month: '5月',
      games: [
        { appid: 2057760, name: '奥秘 消退', cover: 'wall/covers/2057760_vertical.jpg', hours: 24.7, url: steamUrl(2057760) },
        { appid: 686060, name: '喵喵的结合', cover: 'wall/covers/686060_vertical.jpg', url: steamUrl(686060) },
        // Nintendo Switch 2 なので赤カセット。カバーは gamekult の紹介記事より
        { name: 'Pokémon Pokopia', cover: 'wall/covers/pokopia.png', shell: 'red', note: 'Switch 2', url: 'https://www.nintendo.com/us/store/products/pokemon-pokopia-switch-2/' },
      ],
    },
    {
      month: '6〜7月',
      games: [
        { appid: 3693500, name: '白之追猎 Hunter White Demo', cover: 'wall/covers/3693500_header.jpg', note: '体験版', url: steamUrl(3693500) },
        { appid: 2638890, name: '鬼武者 Way of the Sword', cover: 'wall/covers/2638890_vertical.jpg', url: steamUrl(2638890) },
      ],
    },
  ],

  // [フェーズ3] ポスター安利：特にオススメの1本
  posterGame: null,
};
