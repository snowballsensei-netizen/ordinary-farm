// Chaos event tuning. Behaviour lives in src/events/<id>.ts; this file holds
// the numbers the ChaosDirector uses to decide when and how often they fire.

export interface FollowUp {
  id: string;
  chance: number;
}

export interface EventConfig {
  id: string;
  name: string;
  banner: string;
  weight: number;
  cooldownDays: number;
  minDay: number;              // first absolute day this can happen
  big: boolean;                // big events shake the screen and buy a longer quiet period
  timing: 'day' | 'morning';   // 'morning' events happen overnight, revealed at dawn
  seasons?: number[];
  weather?: string[];          // allowed weather for the day
  hint?: string;               // foreshadowing toast shown before it starts
  hintDelay?: [number, number];// in-game minutes between hint and start
  followUps?: FollowUp[];
  journal: string[];           // funny diary lines, one is picked at random
}

export const EVENTS: Record<string, EventConfig> = {
  great_escape: {
    id: 'great_escape', name: 'The Great Escape', banner: 'A chicken has escaped!',
    weight: 10, cooldownDays: 3, minDay: 4, big: false, timing: 'day',
    hint: 'One of the chickens is staring at the barn latch. Intensely. Keep an eye on it.', hintDelay: [20, 45],
    journal: [
      'A chicken broke out of the coop today. It had a plan. I could see it in its eyes.',
      'The chicken escaped again. I am beginning to suspect it is the ringleader.',
      'Chicken jailbreak. The coop fence never stood a chance.',
    ],
  },
  cow_stampede: {
    id: 'cow_stampede', name: 'Cow Stampede', banner: 'STAMPEDE! The cows broke loose!',
    weight: 6, cooldownDays: 4, minDay: 8, big: true, timing: 'day',
    hint: 'The cows are mooing in unison. Check the barn gate.', hintDelay: [15, 30],
    followUps: [{ id: 'crow_swarm', chance: 0.4 }],
    journal: [
      'The cows are in the corn again. I am beginning to suspect the chicken.',
      'Stampede. The ground shook. The crops did not survive. The cows looked pleased.',
      'Herded cows for an hour. They act like they have never seen a fence before.',
    ],
  },
  tornado: {
    id: 'tornado', name: 'Tornado', banner: 'TORNADO! Out of nowhere!',
    weight: 3, cooldownDays: 7, minDay: 10, big: true, timing: 'day', seasons: [0, 1, 2],
    hint: 'The sky is turning a strange shade of green... get the animals somewhere safe.', hintDelay: [25, 40],
    followUps: [{ id: 'great_escape', chance: 0.35 }],
    journal: [
      'A tornado. On a sunny day. The weather radio just said "lol".',
      'Tornado touched down in the field. Found a rock on the roof afterwards.',
      'The tornado took the fence and gave back a different, worse fence.',
    ],
  },
  crow_swarm: {
    id: 'crow_swarm', name: 'Crow Swarm', banner: 'Crows are diving at the crops!',
    weight: 8, cooldownDays: 2, minDay: 2, big: false, timing: 'day',
    hint: 'You hear a lot of cawing in the distance. Scarecrows would help.', hintDelay: [10, 25],
    journal: [
      'Crows. So many crows. One of them winked at me.',
      'The crows held a feast in my field. I was not invited.',
      'Chased crows around the farm for an hour. Excellent cardio.',
    ],
  },
  pig_frenzy: {
    id: 'pig_frenzy', name: 'Truffle Frenzy', banner: 'The pigs smell truffles everywhere!',
    weight: 6, cooldownDays: 3, minDay: 7, big: false, timing: 'day',
    journal: [
      'The pigs dug up half the field looking for truffles. They found two. Worth it?',
      'Pigs went truffle-crazy. My tilled soil is now just dirt with dreams.',
    ],
  },
  goat_bin: {
    id: 'goat_bin', name: 'Goat Gets the Bin', banner: 'The goat is heading for the shipping bin!',
    weight: 7, cooldownDays: 3, minDay: 5, big: false, timing: 'day',
    journal: [
      'The goat ate part of my shipment. It did not seem sorry.',
      'Caught the goat with its head in the shipping bin. It chewed while making eye contact.',
    ],
  },
  mole_invasion: {
    id: 'mole_invasion', name: 'Mole Invasion', banner: 'Moles! Bonk them with the hoe! Tough ones burrow away!',
    weight: 8, cooldownDays: 2, minDay: 3, big: false, timing: 'day', seasons: [0, 1, 2],
    journal: [
      'Moles popped up all over the field. I have become a professional mole-whacker.',
      'Mole invasion. They have tunnels. They have a leader. I have a hoe.',
    ],
  },
  hailstorm: {
    id: 'hailstorm', name: 'Surprise Hailstorm', banner: 'HAIL! Out of a clear sky!',
    weight: 5, cooldownDays: 4, minDay: 6, big: true, timing: 'day', seasons: [0, 1, 2],
    hint: 'The air suddenly feels very cold. The clouds look lumpy.', hintDelay: [10, 20],
    followUps: [{ id: 'mole_invasion', chance: 0.3 }],
    journal: [
      'Hail the size of peas. Then marbles. Then... no. Let us not talk about it.',
      'Surprise hailstorm. The crops look like they lost a fight.',
    ],
  },
  crop_circle: {
    id: 'crop_circle', name: 'Mysterious Crop Circle', banner: 'A crop circle appeared overnight...',
    weight: 4, cooldownDays: 10, minDay: 11, big: false, timing: 'morning',
    journal: [
      'Woke up to a perfect crop circle. The wheat hums. It sells really well though.',
      'Crop circle in the field. The chickens refuse to comment.',
    ],
  },
  sheep_teleport: {
    id: 'sheep_teleport', name: 'Sheep Teleport', banner: 'There is a sheep on the roof.',
    weight: 5, cooldownDays: 5, minDay: 9, big: false, timing: 'morning',
    journal: [
      'There was a sheep on the roof this morning. Nobody knows how. Least of all the sheep.',
      'Sheep on the roof again. I have stopped asking questions.',
    ],
  },
  rogue_sprinkler: {
    id: 'rogue_sprinkler', name: 'Rogue Sprinkler', banner: 'A sprinkler has gone rogue!',
    weight: 6, cooldownDays: 3, minDay: 4, big: false, timing: 'day',
    journal: [
      'A sprinkler went haywire and tried to turn the field into a lake. Fixed it with a hammer.',
      'The sprinkler gained sentience and chose violence.',
    ],
  },
  meteor_shower: {
    id: 'meteor_shower', name: 'Meteor Shower', banner: 'Something is falling from the sky!',
    weight: 1.5, cooldownDays: 14, minDay: 14, big: true, timing: 'day',
    hint: 'A bright streak flashes across the sky...', hintDelay: [5, 15],
    journal: [
      'A meteorite landed on the farm. It left a crater and a very shiny rock.',
      'Space rock. On my farm. The cows were unimpressed.',
    ],
  },
  bee_swarm: {
    id: 'bee_swarm', name: 'Bee Swarm', banner: 'BEE SWARM! An angry hive boiled over!',
    weight: 4, cooldownDays: 2, minDay: 4, big: false, timing: 'day',
    hint: 'The apiary is buzzing louder than usual... have the smoker ready.', hintDelay: [10, 20],
    journal: [
      'An angry cloud of bees chased me around the farm. I ran. The bees ran faster.',
      'Bee swarm. The cows panicked, I panicked, the bees did not panic at all.',
      'Got stung in places I did not know could be stung. Note to self: use the smoker.',
    ],
  },
  // ---- second wave: one new disaster unlocks roughly every day ----
  raccoon_heist: {
    id: 'raccoon_heist', name: 'Raccoon Heist', banner: 'Raccoons are raiding the shipping bin!',
    weight: 9, cooldownDays: 3, minDay: 2, big: false, timing: 'day',
    hint: 'Something is rustling behind the shipping bin... they look fast.', hintDelay: [10, 20],
    followUps: [{ id: 'crow_swarm', chance: 0.15 }],
    journal: [
      'Raccoons robbed the shipping bin. They wore little masks. Of course they did.',
      'Chased a raccoon across the farm. It was carrying a turnip like a football.',
    ],
  },
  locust_plague: {
    id: 'locust_plague', name: 'Locust Plague', banner: 'LOCUSTS! A cloud is heading for the crops!',
    weight: 6, cooldownDays: 4, minDay: 3, big: true, timing: 'day', seasons: [0, 1, 2],
    hint: 'A low buzzing is coming from the horizon. Grab the scythe.', hintDelay: [15, 25],
    followUps: [{ id: 'crow_swarm', chance: 0.3 }],
    journal: [
      'Locusts. Biblical, honestly. I swung the scythe like a madman.',
      'A cloud of locusts ate lunch in my field. My lunch, specifically.',
    ],
  },
  flash_flood: {
    id: 'flash_flood', name: 'Flash Flood', banner: 'FLASH FLOOD! Water is spreading over the field!',
    weight: 5, cooldownDays: 4, minDay: 5, big: true, timing: 'day',
    hint: 'The ground squelches strangely underfoot. Keep a hoe handy for drains.', hintDelay: [15, 25],
    followUps: [{ id: 'mole_invasion', chance: 0.35 }],
    journal: [
      'Flash flood. The field became a lake. The ducks I do not own were thrilled.',
      'Dug drains with a hoe in ankle-deep water. Farming is glamorous.',
    ],
  },
  earthquake: {
    id: 'earthquake', name: 'Earthquake', banner: 'EARTHQUAKE! Hold onto something!',
    weight: 4, cooldownDays: 5, minDay: 6, big: true, timing: 'day',
    followUps: [{ id: 'great_escape', chance: 0.4 }],
    journal: [
      'Earthquake. The cows did not even stop chewing.',
      'The ground cracked open and spat out rocks. I did not order rocks.',
    ],
  },
  wildfire: {
    id: 'wildfire', name: 'Lightning Fire', banner: 'FIRE! Lightning set the grass ablaze!',
    weight: 4, cooldownDays: 5, minDay: 7, big: true, timing: 'day', seasons: [0, 1, 2],
    hint: 'Dry thunder rumbles. There is not a drop of rain. Fill the watering can.', hintDelay: [10, 20],
    followUps: [{ id: 'fog_confusion', chance: 0.25 }],
    journal: [
      'Lightning set the grass on fire. Ran laps with a watering can.',
      'Grass fire. I now respect the watering can as a firefighting tool.',
    ],
  },
  giant_snail: {
    id: 'giant_snail', name: 'Giant Snail', banner: 'A GIANT SNAIL is sliding into the field!',
    weight: 5, cooldownDays: 4, minDay: 8, big: false, timing: 'day', weather: ['rain', 'cloudy', 'sun'],
    followUps: [{ id: 'mole_invasion', chance: 0.2 }],
    journal: [
      'A snail the size of a wheelbarrow ate a row of crops. Very slowly. I watched in horror.',
      'Bonked a giant snail. It looked offended, then left at 0.01 miles per hour.',
    ],
  },
  fog_confusion: {
    id: 'fog_confusion', name: 'Fog of Confusion', banner: 'A thick fog rolls in... the animals are lost!',
    weight: 5, cooldownDays: 4, minDay: 9, big: false, timing: 'day',
    hint: 'The air is getting murky. Make sure the gates are shut.', hintDelay: [10, 20],
    journal: [
      'Fog so thick I herded a bush for ten minutes.',
      'Animals wandered off in the fog. One came back with a stick. I have questions.',
    ],
  },
  alien_abduction: {
    id: 'alien_abduction', name: 'Alien Abduction', banner: 'A UFO is beaming up an animal!',
    weight: 4, cooldownDays: 6, minDay: 10, big: true, timing: 'day',
    hint: 'Strange lights are blinking above the barn. Stay close to the animals.', hintDelay: [5, 12],
    journal: [
      'A UFO tried to steal an animal. I waved a hoe at it. It worked?',
      'Alien abduction attempt. Nobody in town believes me. The chickens do.',
    ],
  },
  pumpkin_uprising: {
    id: 'pumpkin_uprising', name: 'Pumpkin Uprising', banner: 'The crops have come alive!!',
    weight: 4, cooldownDays: 5, minDay: 11, big: false, timing: 'day',
    followUps: [{ id: 'crow_swarm', chance: 0.2 }],
    journal: [
      'My crops got up and walked away. Caught most of them. Harvesting has never been so cardio.',
      'Vegetable uprising. One pumpkin looked me dead in the eye.',
    ],
  },
  heatwave: {
    id: 'heatwave', name: 'Heatwave', banner: 'HEATWAVE! The soil is baking dry!',
    weight: 5, cooldownDays: 4, minDay: 12, big: false, timing: 'day', seasons: [0, 1, 2],
    hint: 'The air is shimmering. It is getting very hot. Fill the watering can.', hintDelay: [10, 20],
    followUps: [{ id: 'wildfire', chance: 0.3 }],
    journal: [
      'Heatwave. Water evaporated before it hit the ground. So did my will to live.',
      'Watered everything twice. The crops drank it like lemonade.',
    ],
  },
  rabbit_boom: {
    id: 'rabbit_boom', name: 'Rabbit Boom', banner: 'Rabbits! And they are multiplying!',
    weight: 6, cooldownDays: 3, minDay: 13, big: false, timing: 'day', seasons: [0, 1, 2],
    followUps: [{ id: 'crow_swarm', chance: 0.2 }],
    journal: [
      'Two rabbits came. Then ten. Rabbits have no chill.',
      'Rabbit population explosion. I now understand math differently.',
    ],
  },
  goose_invasion: {
    id: 'goose_invasion', name: 'Goose Invasion', banner: 'HONK! Geese are coming for you!',
    weight: 5, cooldownDays: 4, minDay: 14, big: false, timing: 'day',
    hint: 'You hear distant, menacing honking. Hold onto your pockets.', hintDelay: [5, 15],
    journal: [
      'Geese chased me around my own farm and stole from my pockets. Peace was never an option.',
      'Goose invasion. One of them took my hat. I want it back.',
    ],
  },
  sinkhole: {
    id: 'sinkhole', name: 'Sinkhole', banner: 'The ground is caving in!',
    weight: 4, cooldownDays: 5, minDay: 15, big: false, timing: 'day',
    followUps: [{ id: 'mole_invasion', chance: 0.4 }],
    journal: [
      'A sinkhole opened in the field. I filled it with a hoe and a lot of swearing.',
      'The ground just... left. Took a few crops with it.',
    ],
  },
  blizzard: {
    id: 'blizzard', name: 'Blizzard', banner: 'BLIZZARD! Snow is piling up!',
    weight: 6, cooldownDays: 3, minDay: 2, big: true, timing: 'day', seasons: [3],
    hint: 'The wind is howling and the sky is going white. Shovels at the ready.', hintDelay: [10, 20],
    followUps: [{ id: 'fog_confusion', chance: 0.2 }],
    journal: [
      'Blizzard. Shovelled snow off the crops with a hoe. Not what hoes are for.',
      'So much snow. The sheep blend in perfectly now.',
    ],
  },
};
