# Build "Ordinary Farm" — Full Game Prompt

You are building **Ordinary Farm**, a 2D top-down pixel-art farming game for the browser. Build the complete project structure plus a playable vertical slice: title screen, 3 save profiles, a working farm with crops and livestock, a day/night cycle, and a random "chaos event" system. Write clean, modular, well-organized code that I can keep extending.

---

## 1. The Concept

Ordinary Farm **starts out as a calm, cozy farming game**. You plant crops, feed animals, sell produce, and upgrade your farm. For the first few in-game days nothing strange happens, so the player gets comfortable.

Then **random events start happening**, and they get more frequent and more ridiculous over time. A chicken escapes, pecks open the cow pen latch, and the cows stampede through the wheat field. A tornado shows up on a sunny afternoon. The goat eats the shipping bin. Events should be **funny and chaotic, never unfair**. The player should always be able to react, clean up, and recover.

**Every playthrough is different.** Each save profile gets its own random seed, so the order, timing, and combination of events changes every time you play.

Tone: wholesome on the surface, getting sillier underneath. Think "cozy farm sim that slowly realizes it's a comedy."

---

## 2. Tech Stack & Constraints

- **Engine:** Phaser 3 (latest stable 3.x) with **TypeScript**, bundled with **Vite**.
- **Runs in the browser.** `npm install` then `npm run dev` must start the game with no other setup.
- **No external art or audio files needed to run.** Generate all pixel art in code at boot: draw sprites onto canvases or Phaser Graphics and turn them into textures. Put the generators in their own modules so I can swap in real PNG spritesheets later without touching game logic. Do the same for sound: simple Web Audio synth blips and loops, behind an `AudioManager` that can load real files later.
- **Saves:** `localStorage`, 3 independent slots (details in section 6).
- Internal resolution **480×270**, scaled up with integer scaling and `pixelArt: true` / nearest-neighbor so pixels stay crisp. Must fit any window size with letterboxing.
- Target 60 FPS. No console errors.

---

## 3. Project Structure

Use this layout (adjust if you have a good reason, and explain it):

```
ordinary-farm/
├─ index.html
├─ package.json / tsconfig.json / vite.config.ts
├─ README.md                 # how to run, controls, architecture overview
└─ src/
   ├─ main.ts                # Phaser game config & boot
   ├─ config/
   │   ├─ constants.ts       # tile size, time scale, prices, tuning numbers
   │   ├─ crops.ts           # data-driven crop definitions
   │   ├─ animals.ts         # data-driven animal definitions
   │   ├─ items.ts           # tools, seeds, produce, buildables
   │   └─ events.ts          # chaos event definitions & weights
   ├─ scenes/
   │   ├─ BootScene.ts       # generate textures/audio, then go to Title
   │   ├─ TitleScene.ts      # animated title screen
   │   ├─ ProfileScene.ts    # 3-slot save select / create / delete
   │   ├─ FarmScene.ts       # main gameplay world
   │   ├─ UIScene.ts         # HUD overlay running in parallel
   │   ├─ ShopScene.ts       # buy seeds/animals/upgrades
   │   └─ PauseScene.ts
   ├─ systems/
   │   ├─ TimeSystem.ts      # clock, days, seasons, day/night tint
   │   ├─ FarmGrid.ts        # tile states: grass, tilled, watered, planted
   │   ├─ CropSystem.ts
   │   ├─ AnimalSystem.ts    # needs, AI wandering, produce, escaping
   │   ├─ InventorySystem.ts
   │   ├─ EconomySystem.ts
   │   ├─ WeatherSystem.ts
   │   ├─ ChaosDirector.ts   # schedules & runs random events
   │   ├─ SaveSystem.ts
   │   └─ RNG.ts             # seeded PRNG (e.g. mulberry32)
   ├─ entities/              # Player, Animal, Crop, Fence, Gate, Debris, Tornado…
   ├─ events/                # one file per chaos event, shared interface
   ├─ art/                   # procedural pixel-art generators + palette
   ├─ audio/                 # AudioManager + synth sounds
   └─ ui/                    # reusable pixel UI widgets (panels, buttons, toolbar)
```

Keep it **data-driven**. Adding a new crop, animal, or event should mostly mean adding an entry to a config file or a new file in `events/`.

---

## 4. Art Direction

### In-game look: cozy top-down farm-sim pixel art
- **16×16 tiles**, 3/4 top-down perspective, chunky readable sprites. Use your own original designs, not copies of any existing game's sprites.
- **Warm, saturated palette.** Define one shared palette file: grass greens, tilled-soil browns, wood tones, a warm sunset orange, cool night blues.
- Characters are about 16×32 with 4-direction walk cycles (at least 3–4 frames each).
- Small details make the world feel alive: grass tufts, flowers, swaying crops, animals bobbing, shadows under everything, dust puffs when walking, splash particles when watering.
- **Day/night lighting:** a gradual color tint over the day (soft golden morning, bright noon, orange dusk, blue night). Windows and lanterns glow at night.
- Y-sorting so the player walks behind and in front of objects correctly.

### Title screen look: side-view parallax landscape, like a classic 2D sandbox game's title screen
- A **side-scrolling pixel landscape** that pans slowly and endlessly: several parallax layers (distant hills, mid trees, foreground farm with fence, barn, windmill, and a few animals).
- **Animated sky** that cycles through day, sunset, and night, with a moving sun/moon, drifting clouds, and twinkling stars.
- A big **chunky pixel-art logo** reading "ORDINARY FARM" that gently bobs or sways. Once in a while (a small easter egg), a tiny tornado or a fleeing chicken crosses the background as a hint of what's coming.
- **Vertical menu** in a pixel font: `Play`, `Settings`, `Credits`, `Exit`. The hovered option grows and changes color with a soft tick sound. Works with keyboard and mouse.
- A random **splash tagline** under the logo that changes each launch (e.g. "Nothing unusual here!", "Totally normal cows.", "Now with 0% tornadoes*").
- A version number in the corner.

---

## 5. Core Gameplay

### Player & controls
- WASD/arrow keys to move. Mouse or the **E/Space** key to use the tool on the tile you're facing (show a tile highlight cursor).
- **1–9** or the scroll wheel to pick a toolbar slot. **I/Tab** for inventory, **Esc** to pause.
- **Energy bar:** using tools costs energy. Sleeping restores it.

### Tools
Hoe (till soil), Watering Can (limited water, refill at the well/pond), Seed bag (plant), Scythe (harvest / clear grass), Axe & Pickaxe (clear debris), Hammer (repair fences and gates; becomes important once chaos starts), and a basket/hand for petting and collecting animal produce.

### Farming
- Tile states: grass → tilled → watered → planted → growing stages → ready.
- A crop only grows on days it was watered. Rain waters everything.
- At least **6 crops** in data: e.g. Turnip, Potato, Carrot, Wheat, Corn, Pumpkin, Strawberry. Each has a grow time, sell price, season(s), number of visible growth stages, and whether it regrows after harvest.
- Crops wilt or die after several dry days or out of season.

### Livestock
- At least **4 animals**: Chicken (eggs), Cow (milk), Pig (truffles found while roaming), Sheep (wool). A goat is a good optional fifth: it exists mostly to cause trouble.
- Animals live in **fenced enclosures** with a coop or barn, a feed trough, and a water trough.
- Needs: hunger, thirst, happiness (raised by petting). Happy animals produce better items.
- Animals wander with simple AI inside their pen, sleep in their building at night, and react to the player.
- **Fences and gates are real physical objects with durability and a latch state.** The chaos system depends on this.

### Economy & progression
- A shipping bin pays out overnight. A shop sells seeds, feed, animals, fence pieces, and upgrades (bigger watering can, sprinklers, sturdier "reinforced" fences, a lightning rod, a storm cellar, a scarecrow, a chicken-proof latch).
- Some upgrades should directly **counter chaos events**, so the player feels they can prepare for the madness.

### Time & seasons
- 1 in-game day ≈ 12–14 real minutes (tunable constant). The clock runs from 6:00 AM to 2:00 AM. Passing out at 2 AM costs money/energy.
- 4 seasons of 28 days each, with a season indicator. Each season changes the tile palette and which crops grow.
- Sleeping in the farmhouse bed ends the day, shows an end-of-day summary (earnings, events survived), and **autosaves**.

---

## 6. Save Profiles (3 Slots)

- After `Play` on the title screen, show the **Profile Select** screen: three wooden-sign or parchment slot panels.
- **Empty slot:** "New Farm". Clicking it asks for a farmer name and farm name, then generates a new random **world seed**.
- **Used slot:** shows the farmer name, farm name, day/season/year, money, total playtime, and a mini icon. Buttons: **Play** and **Delete** (delete asks for confirmation).
- Each slot is fully independent and stored under its own key (`ordinaryfarm_slot_1`, `_2`, `_3`).
- What gets saved: seed, RNG state, time, player position/energy/inventory/money, every farm tile, every crop, every animal (needs, position, pen), fences/gates (durability, latch), buildings/upgrades, chaos director state (event history, cooldowns, chaos level), and stats.
- Version the save format (`saveVersion`) and include a migration hook. A corrupted save should show "Corrupted save" on its slot, never crash the game.
- Autosave when you sleep, plus a manual "Save & Quit to Title" in the pause menu.

---

## 7. The Chaos Director (the heart of the game)

Build a `ChaosDirector` system that decides **when** and **which** random events happen, using the profile's seeded RNG.

### Pacing
- **Days 1–3: "honeymoon."** Zero events. Pure cozy farming.
- After that, a hidden **Chaos Level** rises slowly over time (and a bit faster as the farm gets bigger and has more to break).
- Each in-game hour, roll for an event. The chance scales with Chaos Level. Every event has its own **weight**, **cooldown**, **minimum day**, **season/weather requirements**, and **preconditions** (no cow stampede unless you own cows).
- Make sure there are calm days too. Give a guaranteed quiet period after a big event so it never feels relentless.
- Small hints sometimes come before an event: a chicken staring at the gate, the sky turning green before a tornado, the radio in the house crackling.

### Event chains
Events can **trigger other events**, and this is what makes the game feel alive and unpredictable. Example chain:

> A chicken pecks through a weak fence → escapes → wanders to the cow pen → flips the gate latch → cows break out → cows trample crops (crops on trampled tiles drop a growth stage or are destroyed) → the player has to herd the cows back (cows walk away from the player, so you push them toward the pen) and repair the gate with the hammer.

Build events as composable pieces: each one can emit follow-up events with a probability.

### Event interface
Each event lives in its own file in `src/events/` and follows one shared interface, for example:

```ts
interface ChaosEvent {
  id: string;
  name: string;               // shown in the notification banner
  weight: number;
  cooldownDays: number;
  minDay: number;
  canTrigger(ctx: GameContext): boolean;
  start(ctx: GameContext): void;
  update(ctx: GameContext, dt: number): void;
  isFinished(ctx: GameContext): boolean;
  end(ctx: GameContext): void;
  serialize?(): object;        // so in-progress events survive a save
}
```

### Starter event list (implement at least 8; leave the rest as stubs with TODOs)
1. **The Great Escape:** a chicken escapes and starts the chain above.
2. **Cow Stampede:** cows break loose and trample crops in a path.
3. **Tornado:** a visible swirling sprite moves across the farm, picks up debris/items/small animals and drops them somewhere else, and knocks down fence segments. Lightning rods and the storm cellar reduce the damage.
4. **Crow Swarm:** birds dive at ripe crops. A scarecrow protects a radius around it.
5. **Pig Truffle Frenzy:** pigs dig up random tiles, which turns tilled soil back into dirt.
6. **Goat Gets the Bin:** the goat eats something out of the shipping bin.
7. **Mole Invasion:** molehills pop up and ruin tilled tiles. Whack them with the hoe.
8. **Surprise Hailstorm:** damages unprotected crops.
9. **Mysterious Crop Circle:** crops arranged in a pattern overnight. They're harmless and actually sell for more. A weird, funny event.
10. **Sheep Teleport:** a sheep is found on the farmhouse roof. Nobody knows how.
11. **Rogue Sprinkler:** a sprinkler floods tiles and drowns crops.
12. **Meteor Shower (rare, late-game):** a tiny meteorite crater that leaves a valuable rare ore.

### Event presentation
- A **banner notification** slides in at the top with the event name and an icon (e.g. "⚠ A chicken has escaped!"). Include a short screen shake for big events, a distinct sound, and a quick camera pan to the event's location before returning control.
- Track every event in a **Farm Journal** the player can open, written in funny diary-style lines ("Day 12: The cows are in the corn again. I am beginning to suspect the chicken.").
- The end-of-day summary lists the chaos survived.

### Fairness rules
- Damage is capped per event, so a single event can never wipe out the whole farm.
- Every event has a counterplay: an upgrade, an action, or just cleaning up afterwards.
- Add a debug key (e.g. **F9**) that opens a menu to force-trigger any event, plus **F10** to toggle a chaos debug overlay (chaos level, next roll, cooldowns). I need these for testing.

---

## 8. UI / HUD

- **Top-right:** clock, day, season, weather icon, and money in a wooden-frame panel.
- **Bottom-center:** 9-slot toolbar with the selected slot highlighted.
- **Left side:** energy bar.
- Inventory grid, shop window, pause menu, settings (volume sliders, fullscreen toggle, keybind display), and the Farm Journal, all in a consistent pixel-art UI style with wood and parchment panels, a pixel font (generate it or use a bitmap approach), and click/hover sounds.

---

## 9. Audio

A simple synthesized `AudioManager` with these sounds: footsteps, hoeing, watering, harvest pop, coin, animal sounds (cluck, moo, oink, baa), UI tick, an event alarm sting, and wind for the tornado. Play a gentle looping background melody that changes between day and night. Volume settings get saved.

---

## 10. Deliverables & Order of Work

Work in this order, and make sure the game runs at the end of each step:

1. Project scaffold, Vite + Phaser + TS, boot scene, procedural palette & texture generation.
2. Title screen with parallax landscape, animated sky, logo, and menu.
3. Profile select with 3 slots and the full save/load/delete flow.
4. Farm map, player movement, collisions, camera follow, Y-sorting.
5. Tools, farm grid, crops, watering, growth, harvesting.
6. Time system, day/night tint, sleeping, end-of-day summary, autosave.
7. Animals, pens, fences/gates with durability and latch, produce.
8. Inventory, shop, shipping bin, economy.
9. ChaosDirector, seeded RNG, the event interface, the first 8 events, banners, the journal, and the debug tools.
10. Weather, audio, polish, and a README.

When you finish, give me:
- The full source code.
- A **README** with setup steps, controls, an architecture overview, and a step-by-step guide to adding a new crop, animal, or chaos event.
- A short list of what's done, what's stubbed, and suggested next features.

## 11. Acceptance Checklist
- [ ] `npm install && npm run dev` launches with no errors.
- [ ] The title screen animates (parallax + day/night sky) and the menu works with mouse and keyboard.
- [ ] 3 save slots can be created, played, saved, reloaded, and deleted independently.
- [ ] I can till, water, plant, grow, and harvest crops, and sell them for money.
- [ ] Animals live in pens, have needs, and produce items.
- [ ] No events on days 1–3. After that, random events happen, and they differ between profiles with different seeds.
- [ ] The chicken → cow gate → trampled crops chain works from start to finish.
- [ ] The tornado moves, scatters things, and breaks fences, and upgrades reduce its damage.
- [ ] An event that's in progress or has just finished stays consistent after save & reload.
- [ ] F9/F10 debug tools work.
