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

// Room 1: The First Chamber
// 30x17, doors on all 4 sides at the midpoints, mostly open with two pillar clusters
// Door positions: north col 15 row 0, south col 15 row 16, west col 0 row 8, east col 29 row 8
export const ROOM_01: RoomData = {
  id: 'room_01',
  name: 'The First Chamber',
  layout: [
    '###############D##############',
    '#............................#',
    '#............................#',
    '#......PP............PP......#',
    '#......PP............PP......#',
    '#............................#',
    '#............................#',
    '#............................#',
    'D............................D',
    '#............................#',
    '#............................#',
    '#............................#',
    '#......PP............PP......#',
    '#......PP............PP......#',
    '#............................#',
    '#............................#',
    '###############D##############',
  ],
  doors: {
    '15,0':  { roomId: 'room_02', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_03', spawnTile: { x: 15, y: 1 } },
    '0,8':   { roomId: 'room_01', spawnTile: { x: 28, y: 8 } },
    '29,8':  { roomId: 'room_01', spawnTile: { x: 1, y: 8 } },
  },
};

// Room 2: The Crooked Walk
// 30x17, snake-pillar maze with a tar patch in the middle
// T = tar tile, P = pillar
// Doors only on north (back to Room 1) and south (to Room 1)
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
    '#............TTTT............#',
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
    '15,0':  { roomId: 'room_01', spawnTile: { x: 15, y: 15 } },
    '15,16': { roomId: 'room_01', spawnTile: { x: 15, y: 1 } },
  },
};

// Room 3: The Puzzle Hall
// 30x17, locked door blocks south exit, pressure plate in center surrounded by spikes (S)
// Player enters from north, must navigate to plate, plate opens locked door (L -> O)
// Sign tile (G) near the entrance with hint
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
    '15,0':  { roomId: 'room_01', spawnTile: { x: 15, y: 1 } },
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

export const ALL_ROOMS: Record<string, RoomData> = {
  room_01: ROOM_01,
  room_02: ROOM_02,
  room_03: ROOM_03,
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
