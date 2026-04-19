import type { KeyTier } from '../game/Inventory';

export interface DoorTarget {
  roomId: string;
  spawnTile: { x: number; y: number };
}

export interface PressurePlateEvent {
  tileX: number;
  tileY: number;
  opensLockedDoorAt: { x: number; y: number };
}

export interface BarrierDef {
  id:    string;
  tiles: Array<{ x: number; y: number }>;
}

export interface ManaShrineData {
  tileX:           number;
  tileY:           number;
  mpCost:          number;
  triggersBarrier: string;
}

export interface RoomData {
  id: string;
  name: string;
  floorTint?: number;
  layout: string[];
  doors: Record<string, DoorTarget>;
  pressurePlates?: PressurePlateEvent[];
  signs?: Record<string, string>;
  keys?:    Array<{ tileX: number; tileY: number; tier: KeyTier }>;
  chests?:  Array<{ tileX: number; tileY: number; tier: KeyTier; fixedLoot?: string }>;
  barriers?:       BarrierDef[];
  manaShrines?:    ManaShrineData[];
  sentinelTriggers?: Array<{ tileX: number; tileY: number }>;
}

// Room 01: Boot Up
// Player spawns at (2,8) — far left mid. Double-wide Z barrier (cols 14-15, rows 1-15) runs
// full room height. Left half: key (6,4), chest (6,12) [mp_large fixed], two signs, shrine (11,8).
// Right half: outcroppings force S-path, sentinel wakes at (22,5), east door at (29,13).
// Barrier dissolves when player stands within 48px of shrine with 20+ MP.
export const ROOM_01: RoomData = {
  id: 'room_01',
  name: 'Boot Up',
  layout: [
    '##############################',  // row 0  — north wall
    '#.............ZZ..PP.........#',  // row 1  — outcrop 1 top (PP cols 18-19)
    '#..G..........ZZ..PP.........#',  // row 2  — Dad sign at col 3
    '#.............ZZ..PP.........#',  // row 3
    '#.............ZZ..PP.........#',  // row 4  — key at (6,4)
    '#.............ZZ..PP.........#',  // row 5  — sentinel trigger at (22,5)
    '#.............ZZ..PP.........#',  // row 6
    '#.............ZZ..PP..PP.....#',  // row 7  — outcrop 2 starts (PP cols 22-23)
    '#.............ZZ..PP..PP.....#',  // row 8  — overlap zone; shrine at (11,8)
    '#.............ZZ..PP..PP.....#',  // row 9  — overlap zone bottom
    '#.............ZZ......PP.....#',  // row 10 — outcrop 1 ends
    '#.............ZZ......PP.....#',  // row 11
    '#..G..........ZZ......PP.....#',  // row 12 — hint sign at col 3; chest at (6,12)
    '#.............ZZ......PP.....D',  // row 13 — east door at col 29
    '#.............ZZ......PP.....#',  // row 14
    '#.............ZZ......PP.....#',  // row 15
    '##############################',  // row 16 — south wall
  ],
  doors: {
    '29,13': { roomId: 'room_02', spawnTile: { x: 1, y: 13 } },
  },
  keys:   [{ tileX: 6, tileY: 4,  tier: 'bronze' }],
  chests: [{ tileX: 6, tileY: 12, tier: 'bronze', fixedLoot: 'mp_large' }],
  signs: {
    '3,2':  "Lincoln Mark James,\nI built this especially for you\nto show you that you can do\nanything you want in this life\nand I love you for eternity.\nHave fun!",
    '3,12': "Your magic near the shrine\nreveals the path forward.\nWatch your mana meter. — Dad",
  },
  barriers: [{
    id: 'barrier_01',
    tiles: [
      { x: 14, y: 1  }, { x: 15, y: 1  },
      { x: 14, y: 2  }, { x: 15, y: 2  },
      { x: 14, y: 3  }, { x: 15, y: 3  },
      { x: 14, y: 4  }, { x: 15, y: 4  },
      { x: 14, y: 5  }, { x: 15, y: 5  },
      { x: 14, y: 6  }, { x: 15, y: 6  },
      { x: 14, y: 7  }, { x: 15, y: 7  },
      { x: 14, y: 8  }, { x: 15, y: 8  },
      { x: 14, y: 9  }, { x: 15, y: 9  },
      { x: 14, y: 10 }, { x: 15, y: 10 },
      { x: 14, y: 11 }, { x: 15, y: 11 },
      { x: 14, y: 12 }, { x: 15, y: 12 },
      { x: 14, y: 13 }, { x: 15, y: 13 },
      { x: 14, y: 14 }, { x: 15, y: 14 },
      { x: 14, y: 15 }, { x: 15, y: 15 },
    ],
  }],
  manaShrines: [{
    tileX: 11, tileY: 8,
    mpCost: 20,
    triggersBarrier: 'barrier_01',
  }],
  sentinelTriggers: [{ tileX: 22, tileY: 5 }],
};

// Room 2: The Crooked Walk
// Snake-pillar maze with a tar patch. N door → room_05, S door → room_01, E door → room_04
export const ROOM_02: RoomData = {
  id: 'room_02',
  name: 'The Crooked Walk',
  layout: [
    '###############D##############',
    '#............................#',
    '#..PPPPPPPP..................#',
    '#............................#',
    '#............................#',
    '#..............PPPPPPPP......#',
    '#............................#',
    '#............TTTT............#',
    '#............TTTT............D',
    '#............TTTT............#',
    '#............TTTT............#',
    '#......PPPPPPPP..............#',
    '#............................#',
    '#............................#',
    '#..................PPPPPPPP..#',
    '#............................#',
    '###############D##############',
  ],
  doors: {
    '15,0':  { roomId: 'room_05', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_01', spawnTile: { x: 15, y: 1  } },
    '29,8':  { roomId: 'room_04', spawnTile: { x: 1,  y: 8  } },
  },
};

// Room 3: The Puzzle Hall
// Locked door blocks south exit, pressure plate in spike ring, sign near entrance
export const ROOM_03: RoomData = {
  id: 'room_03',
  name: 'The Puzzle Hall',
  layout: [
    '###############D##############',
    '#............................#',
    '#.............G..............#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............SSSSS...........#',
    '#............S...S...........#',
    '#............S.B.S...........#',
    '#............S...S...........#',
    '#............SSSSS...........#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '###############L##############',
  ],
  doors: {
    '15,0':  { roomId: 'room_01', spawnTile: { x: 15, y: 1  } },
    '15,16': { roomId: 'room_01', spawnTile: { x: 15, y: 15 } },
  },
  pressurePlates: [
    {
      tileX: 15,
      tileY: 8,
      opensLockedDoorAt: { x: 15, y: 16 },
    },
  ],
  signs: {
    '14,2': 'The way opens to those who step lightly. Watch the spikes.',
  },
};

// Room 4: The Gauntlet
// Narrow central corridor, pillar walls lining both sides, no south exit
// Accessed from room_02's east door, exits via north door back to room_02
export const ROOM_04: RoomData = {
  id: 'room_04',
  name: 'The Gauntlet',
  layout: [
    '###############D##############',
    '#............................#',
    '#.PPPPPPPPPPPPPPPPPPPPPPPPP..#',
    '#............................#',
    '#............................#',
    '#.PPPPPPPPPPPPPPPPPPPPPPPPP..#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#.PPPPPPPPPPPPPPPPPPPPPPPPP..#',
    '#............................#',
    '#............................#',
    '#.PPPPPPPPPPPPPPPPPPPPPPPPP..#',
    '#............................#',
    '#............................#',
    '##############################',
  ],
  doors: {
    '15,0': { roomId: 'room_02', spawnTile: { x: 15, y: 15 } },
  },
  signs: {
    '1,1': "It's not about going around\nthe obstacle.\nIt's about going through it.\n— Dad",
  },
};

// Room 5: The Aquarium
// Large tar pit in the center, dry edges only. Enemies stand in tar (they move normal speed, player doesn't).
// Bronze key on dry east edge. N door → room_09, S door → room_02, E door → room_06
export const ROOM_05: RoomData = {
  id: 'room_05',
  name: 'The Aquarium',
  layout: [
    '###############D##############',
    '#............................#',
    '#............................#',
    '#....TTTTTTTTTTTTTTTTTTTT....#',
    '#....TTTTTTTTTTTTTTTTTTTT....#',
    '#....TTTTTTTTTTTTTTTTTTTT....#',
    '#....TTTTTTTTTTTTTTTTTTTT....#',
    '#....TTTTTTTTTTTTTTTTTTTT....#',
    '#....TTTTTTTTTTTTTTTTTTTT....D',
    '#....TTTTTTTTTTTTTTTTTTTT....#',
    '#....TTTTTTTTTTTTTTTTTTTT....#',
    '#....TTTTTTTTTTTTTTTTTTTT....#',
    '#....TTTTTTTTTTTTTTTTTTTT....#',
    '#............................#',
    '#............................#',
    '#............................#',
    '###############D##############',
  ],
  doors: {
    '15,0':  { roomId: 'room_09', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_02', spawnTile: { x: 15, y: 1  } },
    '29,8':  { roomId: 'room_06', spawnTile: { x: 1,  y: 8  } },
  },
  keys: [{ tileX: 26, tileY: 8, tier: 'bronze' }],
};

// Room 6: The Safe Room
// Clean open floor, heal tiles in corners, no enemies, warm feeling
// W door → room_05, S door → room_07
export const ROOM_06: RoomData = {
  id: 'room_06',
  name: 'The Safe Room',
  layout: [
    '##############################',
    '#............................#',
    '#.HH......................HH.#',
    '#.HH......................HH.#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    'D............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#.HH......................HH.#',
    '#.HH......................HH.#',
    '###############D##############',
  ],
  doors: {
    '0,8':   { roomId: 'room_05', spawnTile: { x: 28, y: 8  } },
    '15,16': { roomId: 'room_07', spawnTile: { x: 15, y: 1  } },
  },
  signs: {
    '14,8': "You made it this far.\nDad is proud of you.\nRest up, hero.",
  },
};

// Room 7: The Pillar Maze
// Dense irregular pillar grid, hard to navigate
// N door → room_06, E door → room_08, S door → room_10
// Bronze chest center-east, hidden behind pillars
export const ROOM_07: RoomData = {
  id: 'room_07',
  name: 'The Pillar Maze',
  layout: [
    '###############D##############',
    '#............................#',
    '#.PP.....PP.....PP.....PP....#',
    '#.PP.....PP.....PP.....PP....#',
    '#............................#',
    '#....PP.....PP.....PP.....PP.#',
    '#....PP.....PP.....PP.....PP.#',
    '#............................#',
    'D...PP.....PP.....PP.....PP..D',
    '#............................#',
    '#....PP.....PP.....PP.....PP.#',
    '#....PP.....PP.....PP.....PP.#',
    '#............................#',
    '#.PP.....PP.....PP.....PP....#',
    '#.PP.....PP.....PP.....PP....#',
    '#............................#',
    '###############D##############',
  ],
  doors: {
    '15,0':  { roomId: 'room_06', spawnTile: { x: 15, y: 15 } },
    '29,8':  { roomId: 'room_08', spawnTile: { x: 1,  y: 8  } },
    '15,16': { roomId: 'room_10', spawnTile: { x: 15, y: 1  } },
  },
  chests: [{ tileX: 24, tileY: 8, tier: 'bronze' }],
};

// Room 8: The Three Plates
// Open room, three pressure plates visible. W door → room_07 only.
export const ROOM_08: RoomData = {
  id: 'room_08',
  name: 'The Three Plates',
  layout: [
    '##############################',
    '#............................#',
    '#............................#',
    '#...B........................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    'D..............B.............#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#.....................B......#',
    '#............................#',
    '##############################',
  ],
  doors: {
    '0,8': { roomId: 'room_07', spawnTile: { x: 28, y: 8 } },
  },
  signs: {
    '14,1': "Sometimes you have to press\nall the right buttons.\nIn games AND in life. — Dad",
  },
};

// Room 9: The Ambush
// Deceptively open, three enemies hidden near corners away from south spawn point
// S door → room_05. Bronze chest near top.
export const ROOM_09: RoomData = {
  id: 'room_09',
  name: 'The Ambush',
  layout: [
    '##############################',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '###############D##############',
  ],
  doors: {
    '15,16': { roomId: 'room_05', spawnTile: { x: 15, y: 1 } },
  },
  chests: [{ tileX: 15, tileY: 3, tier: 'bronze' }],
};

// Room 10: The Arena
// Pillar ring forming a rough circle in the center, enemies inside
// N door → room_07, E door → room_11, S door → room_12
// Bronze key inside the ring — must enter to get it
export const ROOM_10: RoomData = {
  id: 'room_10',
  name: 'The Arena',
  layout: [
    '###############D##############',
    '#............................#',
    '#.......PPPPPPPPP............#',
    '#......PP.......PP...........#',
    '#.....PP.........PP..........#',
    '#.....P...........P..........#',
    '#.....P...........P..........#',
    '#.....P...........P..........#',
    'D.....PP.........PP..........D',
    '#......PP.......PP...........#',
    '#.......PPPPPPPPP............#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '###############D##############',
  ],
  doors: {
    '15,0':  { roomId: 'room_07', spawnTile: { x: 15, y: 15 } },
    '29,8':  { roomId: 'room_11', spawnTile: { x: 1,  y: 8  } },
    '15,16': { roomId: 'room_12', spawnTile: { x: 15, y: 1  } },
  },
  keys: [{ tileX: 15, tileY: 6, tier: 'bronze' }],
};

// Room 11: The Lava Moat
// Lava ring around a center island with a bronze chest on it
// Player must cross lava (taking tick damage) to reach island and fight the enemy
// W door → room_10
export const ROOM_11: RoomData = {
  id: 'room_11',
  name: 'The Lava Moat',
  layout: [
    '##############################',
    '#............................#',
    '#............................#',
    '#...VVVVVVVVVVVVVVVVVVVVVV...#',
    '#...VVVVVVVVVVVVVVVVVVVVVV...#',
    '#...VV..................VV...#',
    '#...VV..................VV...#',
    '#...VV..................VV...#',
    'D...VV..................VV...#',
    '#...VV..................VV...#',
    '#...VV..................VV...#',
    '#...VV..................VV...#',
    '#...VVVVVVVVVVVVVVVVVVVVVV...#',
    '#...VVVVVVVVVVVVVVVVVVVVVV...#',
    '#............................#',
    '#............................#',
    '##############################',
  ],
  doors: {
    '0,8': { roomId: 'room_10', spawnTile: { x: 28, y: 8 } },
  },
  chests: [{ tileX: 15, tileY: 8, tier: 'bronze' }],
};

// Room 12: The Antechamber
// Solemn, clean, heal tiles flanking a locked north passage — the boss door (Phase 4.5)
// S door → room_10. Final sign from Dad.
export const ROOM_12: RoomData = {
  id: 'room_12',
  name: 'The Antechamber',
  layout: [
    '#######LLLLLL#LLLLLL##########',
    '#............................#',
    '#............................#',
    '#............................#',
    '#....HH..............HH......#',
    '#....HH..............HH......#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#....HH..............HH......#',
    '#....HH..............HH......#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '###############D##############',
  ],
  doors: {
    '15,16': { roomId: 'room_10', spawnTile: { x: 15, y: 1 } },
  },
  signs: {
    '14,7': "This is as far as Dad has mapped.\nThe rest is yours to discover.\nI love you, Lincoln. — Dad",
  },
};

export const ALL_ROOMS: Record<string, RoomData> = {
  room_01: ROOM_01,
  room_02: ROOM_02,
  room_03: ROOM_03,
  room_04: ROOM_04,
  room_05: ROOM_05,
  room_06: ROOM_06,
  room_07: ROOM_07,
  room_08: ROOM_08,
  room_09: ROOM_09,
  room_10: ROOM_10,
  room_11: ROOM_11,
  room_12: ROOM_12,
};

export function validateRooms(): void {
  for (const [id, room] of Object.entries(ALL_ROOMS)) {
    if (room.layout.length !== 17) {
      throw new Error(
        `Room "${id}" has ${room.layout.length} rows, expected 17. Layout is malformed.`,
      );
    }
    for (let row = 0; row < room.layout.length; row++) {
      if (room.layout[row].length !== 30) {
        throw new Error(
          `Room "${id}" row ${row} has ${room.layout[row].length} chars, expected 30. Row content: "${room.layout[row]}"`,
        );
      }
    }
  }
}
