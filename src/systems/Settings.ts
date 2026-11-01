import { SETTINGS_KEY } from '../config/constants';

export interface SettingsData {
  music: number;
  sfx: number;
}

const defaults: SettingsData = { music: 0.5, sfx: 0.7 };

export const settings: SettingsData = (() => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...defaults };
})();

export function saveSettings(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage may be unavailable */
  }
}
