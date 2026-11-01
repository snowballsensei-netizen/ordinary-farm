// Generates every texture the game needs. To use real art, load PNGs under
// the same keys in BootScene and skip the matching generator.
import Phaser from 'phaser';
import { genBees } from './bees';
import { genAnimals, genPlayer } from './characters';
import { genCrops } from './crops';
import { registerFonts } from './font';
import { genFx } from './fx';
import { genFx2 } from './fx2';
import { genIcons } from './icons';
import { genObjects } from './objects';
import { genTiles } from './tiles';
import { genTitle } from './title';
import { genInterior } from './interior';

export function generateAllArt(scene: Phaser.Scene): void {
  registerFonts(scene);
  genTiles(scene);
  genPlayer(scene);
  genAnimals(scene);
  genCrops(scene);
  genObjects(scene);
  genIcons(scene);
  genBees(scene);
  genFx(scene);
  genFx2(scene);
  genTitle(scene);
  genInterior(scene);
}
