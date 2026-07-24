// Wall ページの画像素材ベースパス。使用中の素材は画眉 CDN にアップロード済み
// （huamei asset upload --afts-alias tomari-guruguru/wall/... --type file）。
// ローカル(public/wall/)に戻すときは BASE を '' にするだけ。
const BASE = 'https://mdn.alipayobjects.com/huamei_toj2z8/uri/file/as/tomari-guruguru';

export default function asset(path) {
  if (!path || /^https?:\/\//.test(path)) return path; // 絶対URLはそのまま
  return BASE ? `${BASE}/${path}` : path;
}
