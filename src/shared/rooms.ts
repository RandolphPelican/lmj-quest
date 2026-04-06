export interface DoorTarget {
  roomId: string;
  spawnTile: { x: number; y: number };
}

export interface PressurePlateEvent {
  tileX: number;
  tileY: number;
  opensLockedDoorAt: { x: number; y: number };
}

export interface RoomData {
  id: string;
  name: string;
  floorTint?: number;
  layout: string[];
  doors: Record<string, DoorTarget>;
  pressurePlates?: PressurePlateEvent[];
  signs?: Record<string, string>;
}

// Room 01 — The First Chamber
// Empty room. North door leads to Room 02, south door leads to Room 03.
// East/west doors loop back to the same room for quick movement testing.
export const ROOM_01: RoomData = {
  id: 'room_01',
  name: 'The First Chamber',
  layout: [
    '#######D#######',
    '#.............#',
    '#.............#',
    '#.............#',
    '#.............#',
    'D.............D',
    '#.............#',
    '#.............#',
    '#.............#',
    '#.............#',
    '#######D#######',
  ],
  doors: {
    '7,0':  { roomId: 'room_02', spawnTile: { x: 7, y: 9 } },
    '7,10': { roomId: 'room_03', spawnTile: { x: 7, y: 1 } },
    '0,5':  { roomId: 'room_01', spawnTile: { x: 13, y: 5 } },
    '14,5': { roomId: 'room_01', spawnTile: { x: 1,  y: 5 } },
  },
};

// Room 02 — The Crooked Walk
// Three interior pillars force weaving. A 2×2 tar patch sits on the main path.
// Entering from the south (spawning near row 9), the player must navigate
// around the pillars and cross the tar to reach the north exit.
// Both doors return to Room 01 so the player can practice the loop.
export const ROOM_02: RoomData = {
  id: 'room_02',
  name: 'The Crooked Walk',
  layout: [
    '#######D#######',  // row 0  — north door (7,0)
    '#.............#',  // row 1
    '#.P...........#',  // row 2  — pillar at (2,2)
    '#.............#',  // row 3
    '#.......TT....#',  // row 4  — tar at (8,4)(9,4)
    '#.......TT....#',  // row 5  — tar at (8,5)(9,5)
    '#.........P...#',  // row 6  — pillar at (10,6)
    '#.............#',  // row 7
    '#.....P.......#',  // row 8  — pillar at (6,8)
    '#.............#',  // row 9
    '#######D#######',  // row 10 — south door (7,10)
  ],
  doors: {
    '7,0':  { roomId: 'room_01', spawnTile: { x: 7, y: 9 } },
    '7,10': { roomId: 'room_01', spawnTile: { x: 7, y: 1 } },
  },
};

// Room 03 — The Puzzle Hall
// A pressure plate (B) at (6,6) is protected by a C-shaped spike cluster.
// The smart path: go around the spikes from the south (rows 7+) and approach
// the plate from the open south side of the C.  Stepping the plate unlocks
// the locked door (L) at (7,10) and converts it to an open door (O).
// A sign near the entrance gives the player a hint.
export const ROOM_03: RoomData = {
  id: 'room_03',
  name: 'The Puzzle Hall',
  layout: [
    '#######D#######',  // row 0  — north door (7,0)
    '#....G........#',  // row 1  — sign at (5,1)
    '#.............#',  // row 2
    '#.............#',  // row 3
    '#...SSSSS.....#',  // row 4  — spike top bar:  (4,4)(5,4)(6,4)(7,4)(8,4)
    '#...S...S.....#',  // row 5  — spike sides:    (4,5)(8,5)
    '#...S.B.S.....#',  // row 6  — spike sides + plate: (4,6)(8,6), plate at (6,6)
    '#.............#',  // row 7  — open; approach plate from here
    '#.............#',  // row 8
    '#.............#',  // row 9
    '#######L#######',  // row 10 — locked door (7,10) — opens when plate is stepped
  ],
  doors: {
    '7,0':  { roomId: 'room_01', spawnTile: { x: 7, y: 9 } },
    '7,10': { roomId: 'room_01', spawnTile: { x: 7, y: 1 } },
  },
  pressurePlates: [
    {
      tileX: 6,
      tileY: 6,
      opensLockedDoorAt: { x: 7, y: 10 },
    },
  ],
  signs: {
    '5,1': 'The path opens to those who step lightly.',
  },
};

export const ALL_ROOMS: Record<string, RoomData> = {
  room_01: ROOM_01,
  room_02: ROOM_02,
  room_03: ROOM_03,
};
