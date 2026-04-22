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
  barriers?:         BarrierDef[];
  manaShrines?:      ManaShrineData[];
  sentinelTriggers?: Array<{ tileX: number; tileY: number }>;
  deadlocks?:        Array<{ tileX: number; tileY: number }>;
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

// Room 02: The Approach — first real combat. Two StackOverflows, player learns cover.
export const ROOM_02: RoomData = {
  id: 'room_02',
  name: 'The Approach',
  layout: [
    '###############D##############',  // row 0  — north door to room_03
    '#............................#',  // row 1
    '#..PPPP..................PPP.#',  // row 2  — left cover
    '#..PPPP..................PPP.#',  // row 3
    '#............................#',  // row 4
    '#............................#',  // row 5
    '#........PPPP.PPPP...........#',  // row 6  — center pillars
    '#........PPPP.PPPP...........#',  // row 7
    '#............................#',  // row 8
    '#............................#',  // row 9
    '#........PPPP.PPPP...........#',  // row 10
    '#........PPPP.PPPP...........#',  // row 11
    '#............................#',  // row 12
    '#..G.........................#',  // row 13 — sign
    '#..PPP...................PPPP#',  // row 14 — right cover
    '#..PPP...................PPPP#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_03', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_01', spawnTile: { x: 28, y: 13 } },
  },
  signs: {
    '3,13': "[RANDOLPH FILLS — theme: first steps, take cover, breathe]",
  },
};

// Room 03: The Quiet Hall — SAFE ROOM. No enemies, heal tiles, free bronze chest, Dad sign.
export const ROOM_03: RoomData = {
  id: 'room_03',
  name: 'The Quiet Hall',
  layout: [
    '###############D##############',  // row 0
    '#............................#',  // row 1
    '#..HH......................HH#',  // row 2  — heal tiles
    '#..HH......................HH#',  // row 3
    '#............................#',  // row 4
    '#............................#',  // row 5
    '#.............G..............#',  // row 6  — sign
    '#............................#',  // row 7
    '#............................#',  // row 8
    '#............................#',  // row 9
    '#............................#',  // row 10
    '#............................#',  // row 11
    '#............................#',  // row 12
    '#..HH......................HH#',  // row 13 — heal tiles
    '#..HH......................HH#',  // row 14
    '#............................#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_04', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_02', spawnTile: { x: 15, y: 1  } },
  },
  chests: [{ tileX: 15, tileY: 8, tier: 'bronze' }],
  signs: {
    '14,6': "[RANDOLPH FILLS — theme: safe rooms are a gift, take what's offered]",
  },
};

// Room 04: The Snake Pit — hazard corridor. Lava forces lane commitment, InfiniteLoop kites from the back.
export const ROOM_04: RoomData = {
  id: 'room_04',
  name: 'The Snake Pit',
  layout: [
    '###############D##############',  // row 0  — north to room_05
    '#............................#',  // row 1
    '#..G.........................#',  // row 2  — sign
    '#............................#',  // row 3
    '#......VVVVVVVVVVVVVV........#',  // row 4  — lava lane 1
    '#......VVVVVVVVVVVVVV........#',  // row 5
    '#............................#',  // row 6
    '#............................#',  // row 7
    '#...VVVVVV........VVVVVVV....#',  // row 8  — split lava with gap
    '#...VVVVVV........VVVVVVV....#',  // row 9
    '#............................#',  // row 10
    '#............................#',  // row 11
    '#......VVVVVVVVVVVVVV........#',  // row 12 — lava lane 2
    '#......VVVVVVVVVVVVVV........#',  // row 13
    '#............................#',  // row 14
    '#............................#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_05', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_03', spawnTile: { x: 15, y: 1  } },
  },
  keys: [{ tileX: 3, tileY: 3, tier: 'bronze' }],
  signs: {
    '3,2': "[RANDOLPH FILLS — theme: the only way through is through]",
  },
};

// Room 05: The Mimic's Den — Gaslight teaching room. Open floor with pillar pockets, mimics hide in plain sight.
export const ROOM_05: RoomData = {
  id: 'room_05',
  name: "The Mimic's Den",
  layout: [
    '###############D##############',  // row 0
    '#............................#',  // row 1
    '#..G.........................#',  // row 2  — sign
    '#............................#',  // row 3
    '#.....PP..............PP.....#',  // row 4  — corner pillars
    '#.....PP..............PP.....#',  // row 5
    '#............................#',  // row 6
    '#............................#',  // row 7
    '#.............PPPP...........#',  // row 8  — center cover
    '#.............PPPP...........#',  // row 9
    '#............................#',  // row 10
    '#............................#',  // row 11
    '#.....PP..............PP.....#',  // row 12 — corner pillars
    '#.....PP..............PP.....#',  // row 13
    '#............................#',  // row 14
    '#............................#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_06', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_04', spawnTile: { x: 15, y: 1  } },
  },
  signs: {
    '3,2': "[RANDOLPH FILLS — theme: not every gift is a gift, look before you grab]",
  },
};

// Room 06: The Echo Chamber — Hallucination teaching room. Open space, rhythm-reading puzzle.
// Wide open layout is intentional — Hallucinations need room to drift and teleport.
// Walls would neutralize the mechanic.
export const ROOM_06: RoomData = {
  id: 'room_06',
  name: 'The Echo Chamber',
  layout: [
    '###############D##############',  // row 0
    '#............................#',  // row 1
    '#..G.........................#',  // row 2  — sign
    '#............................#',  // row 3
    '#............................#',  // row 4
    '#............................#',  // row 5
    '#............................#',  // row 6
    '#............................#',  // row 7
    '#............................#',  // row 8
    '#............................#',  // row 9
    '#............................#',  // row 10
    '#............................#',  // row 11
    '#............................#',  // row 12
    '#............................#',  // row 13
    '#............................#',  // row 14
    '#............................#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_07', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_05', spawnTile: { x: 15, y: 1  } },
  },
  chests: [{ tileX: 26, tileY: 8, tier: 'bronze' }],
  signs: {
    '3,2': "[RANDOLPH FILLS — theme: timing beats strength]",
  },
};

// Room 07: The Chorus — MemoryLeak teaching room. Parent in back, patrol in middle, player must prioritize.
export const ROOM_07: RoomData = {
  id: 'room_07',
  name: 'The Chorus',
  layout: [
    '###############D##############',  // row 0
    '#............................#',  // row 1
    '#..G.........................#',  // row 2  — sign
    '#............................#',  // row 3
    '#....PPPP............PPPP....#',  // row 4
    '#....PPPP............PPPP....#',  // row 5
    '#............................#',  // row 6
    '#............................#',  // row 7
    '#............................#',  // row 8
    '#............................#',  // row 9
    '#............................#',  // row 10
    '#............................#',  // row 11
    '#....PPPP............PPPP....#',  // row 12
    '#....PPPP............PPPP....#',  // row 13
    '#............................#',  // row 14
    '#............................#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_08', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_06', spawnTile: { x: 15, y: 1  } },
  },
  signs: {
    '3,2': "[RANDOLPH FILLS — theme: some problems multiply if you ignore them]",
  },
};

// Room 08: The Restraint Room — PromptInjection teaching. Three sentries, one real enemy.
// WIRING NOTE (PROMPT B): PromptInjections never die unless attacked — the default
// "all enemies dead" door seal would lock the player in forever if they learn to hold fire.
// The door seal for this room must exclude PromptInjection from the "must be dead" check.
// Flag in GameScene wiring pass — rooms.ts concern ends here.
export const ROOM_08: RoomData = {
  id: 'room_08',
  name: 'The Restraint Room',
  layout: [
    '###############D##############',  // row 0
    '#............................#',  // row 1
    '#..G.........................#',  // row 2
    '#............................#',  // row 3
    '#............................#',  // row 4
    '#.........PP......PP.........#',  // row 5
    '#.........PP......PP.........#',  // row 6
    '#............................#',  // row 7
    '#............................#',  // row 8
    '#............................#',  // row 9
    '#............................#',  // row 10
    '#.........PP......PP.........#',  // row 11
    '#.........PP......PP.........#',  // row 12
    '#............................#',  // row 13
    '#............................#',  // row 14
    '#............................#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_09', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_07', spawnTile: { x: 15, y: 1  } },
  },
  signs: {
    '3,2': "[RANDOLPH FILLS — theme: not everything that looks like a threat is a threat]",
  },
};

// Room 09: The Waiting Game — TechnicalDebt teaching. Player must engage TD before it scales.
export const ROOM_09: RoomData = {
  id: 'room_09',
  name: 'The Waiting Game',
  layout: [
    '###############D##############',  // row 0
    '#............................#',  // row 1
    '#..G.........................#',  // row 2
    '#............................#',  // row 3
    '#............................#',  // row 4
    '#............................#',  // row 5
    '#...PPP...............PPP....#',  // row 6
    '#...PPP...............PPP....#',  // row 7
    '#............................#',  // row 8
    '#............................#',  // row 9
    '#...PPP...............PPP....#',  // row 10
    '#...PPP...............PPP....#',  // row 11
    '#............................#',  // row 12
    '#............................#',  // row 13
    '#............................#',  // row 14
    '#............................#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_10', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_08', spawnTile: { x: 15, y: 1  } },
  },
  keys: [{ tileX: 15, tileY: 8, tier: 'bronze' }],
  signs: {
    '3,2': "[RANDOLPH FILLS — theme: deal with small problems before they become big ones]",
  },
};

// Room 10: The Gauntlet — staged combat (wave room). Wave 1 triggers wave 2 on clear.
// WIRING NOTE (PROMPT B): wave-spawn logic does NOT exist in GameScene yet.
// Either implement a minimal wave system or simplify to a single wave. TB decides during
// PROMPT B — flag only, don't build wave logic in this file.
export const ROOM_10: RoomData = {
  id: 'room_10',
  name: 'The Gauntlet',
  layout: [
    '###############D##############',  // row 0
    '#............................#',  // row 1
    '#..G.........................#',  // row 2
    '#............................#',  // row 3
    '#............................#',  // row 4
    '#.PP......................PP.#',  // row 5  — corner cover
    '#.PP......................PP.#',  // row 6
    '#............................#',  // row 7
    '#............................#',  // row 8
    '#............................#',  // row 9
    '#............................#',  // row 10
    '#.PP......................PP.#',  // row 11
    '#.PP......................PP.#',  // row 12
    '#............................#',  // row 13
    '#............................#',  // row 14
    '#............................#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_11', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_09', spawnTile: { x: 15, y: 1  } },
  },
  chests: [{ tileX: 15, tileY: 8, tier: 'silver' }],
  signs: {
    '3,2': "[RANDOLPH FILLS — theme: the fight is never over until you think it is]",
  },
};

// Room 11: The Parlor — miniboss antechamber. Two tough enemies guarding the path to Room 12.
export const ROOM_11: RoomData = {
  id: 'room_11',
  name: 'The Parlor',
  layout: [
    '###############D##############',  // row 0  — north to room_12
    '#............................#',  // row 1
    '#..G.........................#',  // row 2
    '#............................#',  // row 3
    '#............................#',  // row 4
    '#............................#',  // row 5
    '#............................#',  // row 6
    '#............................#',  // row 7
    '#............................#',  // row 8
    '#............................#',  // row 9
    '#............................#',  // row 10
    '#............................#',  // row 11
    '#............................#',  // row 12
    '#............................#',  // row 13
    '#............................#',  // row 14
    '#............................#',  // row 15
    '###############D##############',  // row 16 — south door back to previous room
  ],
  doors: {
    '15,0':  { roomId: 'room_12', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_10', spawnTile: { x: 15, y: 1  } },
  },
  signs: {
    '3,2': "[RANDOLPH FILLS — theme: the last breath before the storm]",
  },
};

// Room 12: The Antechamber
// Solemn, clean, heal tiles flanking a locked north passage — the boss door (Phase 4.5)
// S door → room_11. Final sign from Dad.
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
    '15,16': { roomId: 'room_11', spawnTile: { x: 15, y: 1 } },
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
