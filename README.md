# Ordinary Farm

A cozy top-down pixel-art farming game that slowly realizes it's a comedy. Plant crops, raise animals, sell produce... and then the chicken escapes, flips the barn latch and the cows stampede through your turnips.

Built with **Phaser 3 + TypeScript + Vite**. Every sprite, the pixel font and all sound are generated in code at boot, so no asset files are needed.

## Play it

**https://snowballsensei-netizen.github.io/ordinary-farm/** (keyboard and mouse)

## Running it

```bash
npm install
npm run dev        # opens http://localhost:5199
npm run build      # type-check + production build into dist/
npm run typecheck
```

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move |
| Shift (hold) | Sprint (1.7× speed, drains 1 energy every 0.25 s while moving; needs more than 3 energy). The energy bar (bottom left, with a number) flashes and shows SPRINT while you sprint |
| Space / Left click | Use the selected tool on the highlighted tile |
| E / Right click | Interact (gates, bin, shop, bed, troughs, petting). Falls back to the tool |
| 1–9 / Mouse wheel | Select toolbar slot |
| I / Tab | Inventory (click two slots to swap) |
| J | Farm Journal |
| Esc | Pause (Save, Settings, Save & Quit) |
| F9 | Debug: force any chaos event, add money, skip time, sleep |
| F10 | Debug: chaos overlay (level, chance, cooldowns, active and pending events) |

Tools target the tile under the mouse when it is within 3 tiles of you (4 for the watering can); a red cursor means it is too far. If the mouse is outside the game or hasn't moved for a few seconds, you act on the tile you're facing.

## How to play

- **Getting started:** when you create a farm, pick a male or female farmer (< > buttons or the Left/Right arrow keys). The first time you walk near the pens, the hives, the shop, the bin and the house, a hint explains them.

- **Farming:** hoe grass → water → plant seeds. Crops only grow on days they were watered, and rain waters everything. Three dry days and a crop withers; crops out of season die when the season changes.
- **Animals:** put hay in the feed trough and use the watering can on the water trough (both are inside the pens). Fed animals produce every morning, and happy ones (pet them daily) give ★ quality items worth 1.5×.
- **Beekeeping:** two hives stand in the apiary east of the starter field, next to a wild flower patch. Each hive has health, a mood (calm → agitated → angry) and a honey fill level. Stand next to a hive to see what it needs.
  - **Food:** bees forage on flowers within 5 tiles. Wild flowers bloom in spring and summer, and flowering crops (strawberry, potato, corn, pumpkin) count too. With no flowers, and every day in winter, pour in **Sugar Water** (select it and press E on the hive).
  - **Smoker:** check every hive with the **Bee Smoker** (it starts in toolbar slot 9; press I for the backpack). A pulsing red **!** above a hive means it needs smoking, sugar water, or its honey is ready at least every 2 days, or the bees get grumpier. Rain and hail also sour their mood.
  - **Honey:** a full hive drips honey (about every 3–4 days). Smoke it, then press E with the smoker or an empty hand to collect Honey and Beeswax. Calm, healthy hives give ★ honey. If you skip the smoke you get stung: **OW!**, and you lose energy.
  - **Neglect:** an angry hive can turn into a **Bee Swarm** that chases you, stings you (draining energy) and panics the animals. Puff the smoker at it 5–6 times before it wakes back up (sugar water counts as 2 puffs, twice at most). After 4 hungry days, or when its health hits zero, a hive loses its queen. Buy a **Queen Bee** to restart it. The shop's Supplies tab sells sugar water, queens, spare smokers and new **Beehives** (press E on an empty stand).
- **Selling:** sell at the shop (SELL tab, click = 1, Shift+click = whole stack) for instant gold, or stand at the shipping bin with an item selected and press E to get paid overnight with a +25% bonus.
- **Shop:** the striped stall next to the house sells seeds, hay, planks, sprinklers, scarecrows, animals and upgrades.
- **Farmhouse:** press E at the door to go inside (time and chaos keep running outside). The cozy two-room interior has a scrolling camera and E-interactable furniture: the **bed** ends the day (summary + autosave; staying up past 2 AM makes you pass out and costs money), the **fish tank** needs feeding once a day (fed fish sometimes breed, three unfed days and one dies), the **desk** shows farm records (gold earned, days, disasters survived), the **kitchen** cooks 1 produce into +30 energy, and the **TV** has farm news that hints when chaos is brewing. Bookshelf, windows (day/night sky), lamp and fireplace glow at night are mostly for looks. Walk onto the door mat to leave. Saves always load outside by the door.
- **Herding:** escaped animals run away from you. Open the gate (E), push them toward their pen, then close it. They also walk in on their own when they're near an open gate.
- **Repairs:** use the hammer on a damaged or broken fence. Each repair uses 1 plank (chop branches and stumps with the axe, or buy planks).

## The chaos

A day lasts about **7.5 real minutes** (6 AM to 2 AM). Day 1 is gentle: one small event in the afternoon (2–4 PM) shows you that chaos is the game. From **day 2 on, chaos starts at breakfast**: the first event is scheduled for **6:30–8:00 AM**, announced by a short warning banner, and more follow about every **2–3 in-game hours**, with the gap shrinking as the days go by. Events are picked with the profile's **seeded RNG**, so every farm gets a different sequence, by weight among the events whose requirements and unlock days are met. If nothing has happened by **8 AM** the director forces one. On top of the schedule, each in-game hour still rolls for a bonus event. A hidden chaos level rises every day, a bit faster as the farm grows; it raises the hourly chance and makes big events more likely. The daily cap starts at 2 events and grows by 1 every 4 days (max 7). From **day 6** events can overlap. Quiet periods after an event are short (25 min, 75 after a big one), and there are no calm days.

Each event has an unlock day (below), staggered so a new disaster becomes possible every day or two. The director strongly prefers events you have **never seen** (tracked in the saved chaos state). Some events give you a hint first, such as a green sky before a tornado.

| Unlocks | Event | Counterplay |
| --- | --- | --- |
| 4 | The Great Escape: a chicken breaks out, races to the barn and flips the latch, which **triggers a Cow Stampede** | Chicken-Proof Latch upgrade, cut the chicken off, herding, hammer |
| 8 | Cow Stampede: barn animals break the gate and trample crops (cap ~26+ tiles); loose animals bolt again if left alone | Herd them back quickly, repair the gate |
| 10 | Tornado: a longer, zigzagging twister moves debris, scatters items, throws chickens, smashes fences | Lightning Rod (half damage), Storm Cellar (animals safe), Reinforced Fences |
| 2 | Crow Swarm: 5–11 crows dive erratically at crops; scared crows circle back twice, and a feast left alone draws reinforcements | Walk at them (again and again), Scarecrow (6-tile radius stops comebacks) |
| 7 | Truffle Frenzy: pigs dig up tilled soil fast (and find truffles) | Herd them back, re-till |
| 5 | Goat Gets the Bin: the goat eats part of your shipment, then comes back for seconds (thirds later on) | Goat-Proof Bin Lid, herd it home after the first bite |
| 3 | Mole Invasion: 8–18 moles pop up in tilled soil; tough ones burrow away and resurface, escaped ones tunnel on | Bonk them with the hoe (tough moles take two bonks) |
| 6 | Surprise Hailstorm: a longer storm that gets heavier halfway; crops lose growth stages | Hail Netting |
| 11 | Mysterious Crop Circle (overnight): a ring of Mystery Wheat worth 150g each | Harvest it! |
| 9 | Sheep Teleport (overnight): a sheep appears on the roof | Interact with the house door to fetch the ladder |
| 4 | Rogue Sprinkler: floods and drowns nearby crops, spraying wider over time | Hit it with the hammer 3–4 times |
| 14 | Meteor Shower: leaves a crater with Star Ore; fragments crush crops and scatter rocks | Pickaxe it (3 hits) for 750g ore |
| 2 | Raccoon Heist: 3–6 raccoons raid the shipping bin or nibble crops; they juke, outrun a walking farmer, and come back once if scared off empty-handed | Sprint into a raccoon to get the loot back |
| 3 | Locust Plague: a 6–8 hit cloud drifts erratically from crop to crop; hits split big clouds in two, and ignored clouds regrow | Scythe every cloud until the "hits left" count reaches 0 |
| 5 | Flash Flood: water spreads fast over the field and keeps drowning crops until enough drains are dug, then recedes | Hoe 3–6 flooded tiles to dig drains (progress toast counts them) |
| 6 | Earthquake: rattles up to 6 fences; a minute of aftershocks opens cracks that erupt into rocks and split neighbouring tiles | Pickaxe the cracks (2 hits each) before they erupt |
| 7 | Lightning Fire: grass fire spreads fast (embers jump tiles) over grass and dry crops; a soaked flame smoulders and flares back up | Watering can on each flame twice (wet soil does not burn) |
| 8 | Giant Snail: slides along crop rows eating each crop, then turns onto another row; speeds up when hurt | Hit it 8+ times with any tool (follow it, it lurches when hit) |
| 9 | Fog of Confusion: dark fog, 2–5 animals wander out of the gate and keep drifting; more slip out if it lingers | Herd them back; the fog lifts when all are home |
| 10 | Alien Abduction (after 6 PM): a UFO beams up an animal and may return for a second one; if it succeeds the animal comes back unhappy | Hit the UFO 4–5 times with any tool or interact (each hit lowers the animal) |
| 11 | Pumpkin Uprising: crops uproot and walk around stomping others; stomped crops can join the uprising | Catch each one twice (interact, scythe or basket); the first grab only makes it wriggle free |
| 12 | Heatwave: all tilled soil dries, the first watering of each crop evaporates, hot spells re-dry crops and thirsty crops wilt | Water every crop twice, and keep re-checking |
| 13 | Rabbit Boom: 3–4 rabbits zig-zag in, nibble crops and multiply every 7 s (up to 16–24); shooed rabbits hop back once | Walk at them early and often, before they breed |
| 14 | Goose Invasion: 3–6 geese chase you, snatch items and peck (draining energy); geese with loot circle back | Whack each goose twice with any tool to get items back and drive it off |
| 15 | Sinkhole: a hole opens and widens faster over time, swallowing crops; leftovers become molehills | Fill holes with the hoe (2 scoops each) |
| 2 (winter) | Blizzard: snowdrifts pile up fast; a drift left on a crop frosts it again and again | Clear drifts with the hoe or scythe, and keep clearing |
| 4 | Bee Swarm: an angry hive chases you, stings hard and panics the animals; after a while it grows bigger and angrier | Smoker (5+ puffs, drowsiness wears off if you pause), sugar water counts as 2 puffs, smoke hives every 2 days |

Damage from every event is capped. Events can chain: stampedes can attract crows, tornadoes can free chickens, and hail can bring moles. Everything is written up in the **Farm Journal**.

## Accounts

Pressing Play asks you to log in or create an account: a username of 3+ characters and a password of at least 6, with no email or verification. Each account gets its own three farm slots, and you stay signed in until you choose Log Out on the title screen.

There is no server. Accounts and farms are stored in the browser (`src/systems/AccountSystem.ts`), so they stay on that browser and device, and clearing site data erases them. Passwords are stored as salted PBKDF2 hashes, but this only separates accounts sharing a browser; it is not protection against someone with access to that browser's storage. The first account created on a browser takes over any farms saved before accounts existed.

## Save profiles

There are three independent slots per account in `localStorage` (`ordinaryfarm_user_<name>_slot_1..3`). Each one stores the world seed, both RNG states, the full farm, animals, fences, inventory, upgrades, journal and chaos state, including events still in progress. Saves are versioned (`SAVE_VERSION`), with a migration table in `src/systems/SaveSystem.ts`. A save that fails to load shows as "Corrupted save" instead of crashing the game.

## Architecture

```
src/
├─ main.ts                 Phaser config, integer pixel scaling
├─ config/                 Data-driven tuning (edit these first)
│   ├─ constants.ts        Tile size, time scale, prices, chaos tuning
│   ├─ crops.ts            Crop definitions
│   ├─ animals.ts          Animal definitions
│   ├─ items.ts            Items + upgrades (seeds/produce generated from crops)
│   └─ events.ts           Chaos event weights, cooldowns, hints, chains, journal lines
├─ art/                    Procedural pixel-art generators (one texture key per sprite)
├─ audio/                  Web Audio synth SFX + step-sequencer music
├─ world/
│   ├─ types.ts            SaveData — the entire game state
│   ├─ layout.ts           Fixed farm layout (house, pens, pond, paths)
│   ├─ worldgen.ts         New-game generation (seeded debris, starting animals)
│   └─ WorldView.ts        Renders state: tilemap, crops, fences, lighting, FX
├─ systems/
│   ├─ GameContext.ts      Shared context handed to every system and event
│   ├─ FarmGrid.ts         Tile queries, collision, fences
│   ├─ CropSystem.ts  AnimalSystem.ts  InventorySystem.ts  EconomySystem.ts
│   ├─ TimeSystem.ts  WeatherSystem.ts
│   ├─ ChaosDirector.ts    When/which events fire, hints, chains, quiet periods
│   ├─ SaveSystem.ts  Settings.ts  RNG.ts  bus.ts
├─ entities/Player.ts
├─ events/                 One file per chaos event + ChaosEvent base + registry
├─ scenes/                 Boot, Title, Profile, Farm, UI (HUD), Inventory, Shop,
│                          Pause, Journal, Summary, Settings, House (interior)
└─ ui/widgets.ts           Pixel text, panels, buttons, sliders, item icons
```

Changes from the original brief's structure:
- `world/` holds the state types, layout and renderer, which keeps `systems/` purely about rules.
- `GameContext` is passed into each event's constructor instead of into every method.

**Flow:** `FarmScene` owns a `GameContext` with the `SaveData` and all systems. Systems change state and ask `WorldView` to redraw the affected tiles. The HUD (`UIScene`) listens on a small event bus for toasts, banners, hints and dialogs.

### Adding a crop
Add an entry to `CROPS` in `src/config/crops.ts` with id, seasons, days, stages, sell, seed price, `kind` (`root`, `grain`, `stalk`, `bush` or `vine`) and colors. Seeds, produce, icons, growth sprites and the shop listing are generated automatically.

### Adding an animal
1. Add an entry to `ANIMALS` in `src/config/animals.ts`.
2. Add string-art for its sprite in `src/art/characters.ts` (`genAnimals`). The texture key must equal the animal id.
3. If it makes a new product, add that item to `src/config/items.ts` and an icon to `OTHER` in `src/art/icons.ts`.

### Adding a chaos event
1. Add its tuning to `EVENTS` in `src/config/events.ts`: weight, cooldown, min day, timing, optional hint and follow-ups, and journal lines.
2. Create `src/events/MyEvent.ts` extending `ChaosEvent`. Implement `start()`, and optionally `canTrigger()`, `update(dt)`, `end()`, `onTool()`, `onInteract()`, `location()`, and `serialize()`/`restore()` so it survives Save & Quit. Use `this.ctx.chaosRng` for randomness so it stays seeded.
3. Register it in `src/events/registry.ts`. It now shows up in the F9 debug menu.

## Status

**Done:** animated title screen, 3 save profiles, farming, 8 crops plus Mystery Wheat, 5 animals with needs, produce and quality, fences and gates with durability, shop and upgrades, shipping, day/night lighting, seasons, weather, end-of-day summary, journal, 27 chaos events with chains, an unlock schedule and a daily guarantee, synth audio, and the F9/F10 debug tools.

**Simplified:**
- Animals path with simple steering plus waypoints along the farm roads (no A*).
- Music is a short procedural loop.

**Ideas for next steps:** NPC neighbours, crafting, a greenhouse, more chain reactions (a goat eating the scarecrow), animal ageing, winter events, controller support, and real hand-drawn spritesheets loaded under the same texture keys.
