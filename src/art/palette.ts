// One shared palette so every generated sprite feels like part of the same world.

export const P = {
  ink: '#26303f',
  dark: '#3e3a4a',
  brown: '#8a5a44',
  wood: '#b87a56',
  woodLight: '#d49a6e',
  woodPale: '#ecc497',
  tan: '#e2b98c',
  cream: '#f6ead0',
  white: '#fffaf0',
  red: '#e0604a',
  redDark: '#a8403a',
  roof: '#d9664e',
  roofDark: '#a54a40',
  orange: '#f08a5a',
  sunset: '#f6a070',
  yellow: '#f5cf5a',
  yellowLight: '#fff0a6',
  gold: '#d8a840',
  leaf: '#45a83e',
  leafDark: '#2e7a34',
  leafLight: '#8fd86a',
  blue: '#4a7ab8',
  blueDark: '#35548a',
  glass: '#a8dcea',
  water: '#4a8cc0',
  waterLight: '#7ab8dc',
  waterFoam: '#d2f0f6',
  gray: '#8c95a8',
  grayDark: '#5c6478',
  grayLight: '#bcc4d4',
  stone: '#9aa0aa',
  stoneLight: '#c0c6cc',
  stoneDark: '#6a7080',
  skin: '#f6c8a8',
  skinDark: '#dc9c84',
  pink: '#f5a0b4',
  purple: '#8a6ac8',
  black: '#1e2230',
  soil: '#a0705a',
  soilLight: '#b8846a',
  soilDark: '#7e5648',
  tilled: '#6e4a44',
  tilledLight: '#86605a',
  tilledDark: '#52363a',
  wet: '#47333a',
  wetLight: '#5c4248',
  wetDark: '#33242c',
  shadow: '#5a6e94',
  teal: '#2f8f8a',
  coral: '#ef7a62',
  night: '#1b2a52',
};

export interface GrassPal {
  base: string;
  light: string;
  dark: string;
  deep: string;
  flower: string[];
}

export const GRASS: GrassPal[] = [
  { base: '#66c84f', light: '#8fe06a', dark: '#52b041', deep: '#3d9234', flower: ['#ff9aa8', '#fff1a0', '#ffffff', '#c8a8f0'] },
  { base: '#55b843', light: '#7cd25c', dark: '#45a038', deep: '#33822e', flower: ['#ffd25a', '#7ab8f0', '#ff7a5a', '#ffffff'] },
  { base: '#b8a84a', light: '#d4c46a', dark: '#9e9040', deep: '#7c7434', flower: ['#e8653a', '#d84a4a', '#f5cf5a', '#a8603a'] },
  { base: '#e2ecf0', light: '#f8fbfc', dark: '#c8d8e4', deep: '#a0b4cc', flower: ['#ffffff', '#c8d8f0', '#e04a5a', '#a8c0d8'] },
];

export function hexNum(col: string): number {
  return parseInt(col.slice(1), 16);
}
