export enum TileFlag {
  None = 0,
  Solid = 1 << 0,
  Tar = 1 << 1,
  Spikes = 1 << 2,
  Door = 1 << 3,
  PressurePlate = 1 << 4,
  LockedDoor = 1 << 5,
  Sign = 1 << 6,
}

export interface TileDefinition {
  char: string;
  flags: number;
  color: number;
  strokeColor?: number;
}

export const TILE_SIZE = 32;
export const ROOM_WIDTH_TILES = 15;
export const ROOM_HEIGHT_TILES = 11;
export const ROOM_PIXEL_WIDTH = ROOM_WIDTH_TILES * TILE_SIZE;
export const ROOM_PIXEL_HEIGHT = ROOM_HEIGHT_TILES * TILE_SIZE;

export const TILES: Record<string, TileDefinition> = {
  '.': { char: '.', flags: TileFlag.None,                          color: 0x2a2a2a },
  '#': { char: '#', flags: TileFlag.Solid,                         color: 0x555555, strokeColor: 0x777777 },
  'T': { char: 'T', flags: TileFlag.Tar,                           color: 0x1a1a0a },
  'S': { char: 'S', flags: TileFlag.Spikes,                        color: 0x3a1a1a },
  'P': { char: 'P', flags: TileFlag.Solid,                         color: 0x6a6a6a, strokeColor: 0x8a8a8a },
  'D': { char: 'D', flags: TileFlag.Door,                          color: 0x4a3a1a },
  'B': { char: 'B', flags: TileFlag.PressurePlate,                 color: 0x1a4a6a },
  'L': { char: 'L', flags: TileFlag.Solid | TileFlag.LockedDoor,   color: 0x6a4a1a, strokeColor: 0xaa7a2a },
  'O': { char: 'O', flags: TileFlag.Door,                          color: 0x4a3a1a },
  'G': { char: 'G', flags: TileFlag.Solid | TileFlag.Sign,         color: 0x6a5a3a, strokeColor: 0x8a7a5a },
};

export const FALLBACK_TILE: TileDefinition = TILES['#'];
