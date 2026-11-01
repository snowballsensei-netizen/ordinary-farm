// The shared context every system and chaos event receives. It owns the save
// data and wires the systems together.
import { SEASONS } from '../config/constants';
import type { Player } from '../entities/Player';
import type { FarmScene } from '../scenes/FarmScene';
import type { WorldView } from '../world/WorldView';
import type { SaveData } from '../world/types';
import type { AnimalSystem } from './AnimalSystem';
import type { BeeSystem } from './BeeSystem';
import { bus, EV } from './bus';
import type { ChaosDirector } from './ChaosDirector';
import type { CropSystem } from './CropSystem';
import type { EconomySystem } from './EconomySystem';
import type { FarmGrid } from './FarmGrid';
import type { InventorySystem } from './InventorySystem';
import { RNG } from './RNG';
import type { TimeSystem } from './TimeSystem';
import type { WeatherSystem } from './WeatherSystem';

export class GameContext {
  rng: RNG;
  chaosRng: RNG;
  grid!: FarmGrid;
  view!: WorldView;
  time!: TimeSystem;
  crops!: CropSystem;
  animals!: AnimalSystem;
  bees!: BeeSystem;
  inv!: InventorySystem;
  economy!: EconomySystem;
  weather!: WeatherSystem;
  chaos!: ChaosDirector;
  player!: Player;
  /** Seconds remaining during which player input is frozen (camera pans etc.). */
  freeze = 0;

  constructor(public scene: FarmScene, public state: SaveData) {
    this.rng = new RNG(state.rngState);
    this.chaosRng = new RNG(state.chaosRngState);
  }

  get upg(): Record<string, boolean> {
    return this.state.upgrades;
  }

  absMinute(): number {
    return this.state.absDay * 1440 + this.state.minutes;
  }

  dateLabel(): string {
    const s = this.state;
    return `${SEASONS[s.season]} ${s.day}, Year ${s.year}`;
  }

  toast(msg: string, color?: number): void {
    bus.emit(EV.toast, msg, color);
  }

  hud(): void {
    bus.emit(EV.hud);
  }

  addJournal(text: string): void {
    this.state.journal.push({ absDay: this.state.absDay, label: this.dateLabel(), text });
  }

  /** Copy RNG states back into the save before serialising. */
  syncRng(): void {
    this.state.rngState = this.rng.state;
    this.state.chaosRngState = this.chaosRng.state;
  }
}
