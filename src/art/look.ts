// Farmer appearance. Male uses the 'player' texture and walk_<dir> anims;
// female uses 'player_f' and walk_<dir>_f (same frame layout).
export type Look = 'm' | 'f';

export function playerTex(look: Look | undefined): string {
  return look === 'f' ? 'player_f' : 'player';
}

export function walkAnim(dir: string, look: Look | undefined): string {
  return look === 'f' ? `walk_${dir}_f` : `walk_${dir}`;
}
