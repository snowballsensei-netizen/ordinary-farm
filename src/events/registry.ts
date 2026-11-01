// Every chaos event, keyed by id. To add one: write a ChaosEvent subclass in
// this folder, add its config to config/events.ts, and register it here.
import type { GameContext } from '../systems/GameContext';
import { BeeSwarm } from './BeeSwarm';
import type { ChaosEvent } from './ChaosEvent';
import { CowStampede } from './CowStampede';
import { CropCircle } from './CropCircle';
import { CrowSwarm } from './CrowSwarm';
import { GoatBin } from './GoatBin';
import { GreatEscape } from './GreatEscape';
import { Hailstorm } from './Hailstorm';
import { MeteorShower } from './MeteorShower';
import { MoleInvasion } from './MoleInvasion';
import { PigFrenzy } from './PigFrenzy';
import { RogueSprinkler } from './RogueSprinkler';
import { SheepTeleport } from './SheepTeleport';
import { Tornado } from './Tornado';
import { RaccoonHeist } from './RaccoonHeist';
import { LocustPlague } from './LocustPlague';
import { FlashFlood } from './FlashFlood';
import { Earthquake } from './Earthquake';
import { Wildfire } from './Wildfire';
import { AlienAbduction } from './AlienAbduction';
import { GiantSnail } from './GiantSnail';
import { FogOfConfusion } from './FogOfConfusion';
import { PumpkinUprising } from './PumpkinUprising';
import { Heatwave } from './Heatwave';
import { RabbitBoom } from './RabbitBoom';
import { GooseInvasion } from './GooseInvasion';
import { Sinkhole } from './Sinkhole';
import { Blizzard } from './Blizzard';

export const EVENT_FACTORIES: Record<string, (ctx: GameContext) => ChaosEvent> = {
  great_escape: (c) => new GreatEscape(c),
  cow_stampede: (c) => new CowStampede(c),
  tornado: (c) => new Tornado(c),
  crow_swarm: (c) => new CrowSwarm(c),
  pig_frenzy: (c) => new PigFrenzy(c),
  goat_bin: (c) => new GoatBin(c),
  mole_invasion: (c) => new MoleInvasion(c),
  hailstorm: (c) => new Hailstorm(c),
  crop_circle: (c) => new CropCircle(c),
  sheep_teleport: (c) => new SheepTeleport(c),
  rogue_sprinkler: (c) => new RogueSprinkler(c),
  meteor_shower: (c) => new MeteorShower(c),
  bee_swarm: (c) => new BeeSwarm(c),
  raccoon_heist: (c) => new RaccoonHeist(c),
  locust_plague: (c) => new LocustPlague(c),
  flash_flood: (c) => new FlashFlood(c),
  earthquake: (c) => new Earthquake(c),
  wildfire: (c) => new Wildfire(c),
  alien_abduction: (c) => new AlienAbduction(c),
  giant_snail: (c) => new GiantSnail(c),
  fog_confusion: (c) => new FogOfConfusion(c),
  pumpkin_uprising: (c) => new PumpkinUprising(c),
  heatwave: (c) => new Heatwave(c),
  rabbit_boom: (c) => new RabbitBoom(c),
  goose_invasion: (c) => new GooseInvasion(c),
  sinkhole: (c) => new Sinkhole(c),
  blizzard: (c) => new Blizzard(c),
};
