import Phaser from 'phaser';
import {
  TILE_SIZE,
  ROOM_HEIGHT_TILES,
  PLAYFIELD_X,
  PLAYFIELD_Y,
  TileFlag,
} from '../shared/tiles';
import { ALL_ROOMS } from '../shared/rooms';
import type { RoomData, DoorTarget } from '../shared/rooms';
import { Room } from '../game/Room';
import { Player, type WASDKeys } from '../game/Player';
import { HUD } from '../game/HUD';
import { DebugOverlay } from '../game/DebugOverlay';
import type { Enemy } from '../game/entities/Enemy';
import { NullPointer } from '../game/entities/NullPointer';
import { StackOverflow } from '../game/entities/StackOverflow';
import { InfiniteLoop } from '../game/entities/InfiniteLoop';
import { EnemyProjectile } from '../game/entities/EnemyProjectile';
import { PauseManager } from '../game/PauseManager';
import type { CharacterDefinition } from '../shared/characters';
import { Inventory } from '../game/Inventory';
import { SignPopup } from '../game/SignPopup';
import { KeyItem } from '../game/entities/KeyItem';
import { Chest } from '../game/entities/Chest';
import { LootItem } from '../game/entities/LootItem';
import { rollEnemyDrop, rollLoot, BRONZE_POOL, SILVER_POOL, GOLD_POOL, LOOT_TABLE, initLootSeed } from '../shared/loot';
import { validateManifest, LEVEL_1_MANIFEST } from '../shared/manifest';
import { ManaShrine } from '../game/entities/ManaShrine';
import { Sentinel } from '../game/entities/Sentinel';

const CANVAS_W = 960;
const CANVAS_H = 640;

type SlideDir = 'north' | 'south' | 'east' | 'west';

type SpawnProjectileData = {
  x: number; y: number;
  dirX: number; dirY: number;
  damage: number;
};

export class GameScene extends Phaser.Scene {
  private selectedCharacter!: CharacterDefinition;

  private player!: Player;
  private hud!: HUD;
  private debugOverlay!: DebugOverlay;
  private pauseManager!: PauseManager;

  private currentRoom!: Room;
  private currentCollider!: Phaser.Physics.Arcade.Collider;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASDKeys;
  private f1Key!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private jKey!: Phaser.Input.Keyboard.Key;
  private pKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;

  private transitioning = false;
  private transitionInProgress = false;
  private readonly triggeredPlates = new Set<string>();

  private readonly enemyMap = new Map<string, Enemy[]>();
  private activeProjectiles: EnemyProjectile[] = [];
  private aiDebugOn = false;

  private inventory!: Inventory;
  private signPopup!: SignPopup;
  private signPopupOpen = false;
  private readonly keyMap   = new Map<string, KeyItem[]>();
  private readonly chestMap = new Map<string, Chest[]>();
  private chestColliders: Phaser.Physics.Arcade.Collider[] = [];
  private readonly lootMap         = new Map<string, LootItem[]>();
  private readonly droppedSet      = new Set<Enemy>();
  private readonly barrierMap      = new Map<string, Phaser.Physics.Arcade.StaticGroup>();
  private readonly shrineMap       = new Map<string, ManaShrine[]>();
  private readonly sentinelMap     = new Map<string, Sentinel[]>();
  private readonly chestFixedLoot  = new Map<object, string>();
  private readonly sentinelKilledSet = new Set<Sentinel>();
  private manaRefillActive = false;

  // Configurable level spawn — override per level in future phases
  private readonly LEVEL_SPAWN = { roomId: 'room_01', tileX: 2, tileY: 8 };

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { character: CharacterDefinition }): void {
    // Generate session seed from timestamp, init loot RNG
    const sessionSeed = Date.now() & 0xffffffff;
    initLootSeed(sessionSeed);

    // Validate level manifest — throws hard error if level is unwinnable
    validateManifest(LEVEL_1_MANIFEST);

    this.selectedCharacter = data.character;
    this.triggeredPlates.clear();
    this.transitioning        = false;
    this.transitionInProgress = false;
    this.aiDebugOn = false;
    this.enemyMap.clear();
    this.activeProjectiles = [];
    this.inventory = new Inventory();
    this.keyMap.clear();
    this.chestMap.clear();
    this.chestColliders = [];
    this.lootMap.clear();
    this.droppedSet.clear();
    for (const group of this.barrierMap.values()) group.clear(true, true);
    this.barrierMap.clear();
    for (const shrines   of this.shrineMap.values())   for (const s of shrines)   s.destroy();
    this.shrineMap.clear();
    for (const sentinels of this.sentinelMap.values()) for (const s of sentinels) s.forceDestroy();
    this.sentinelMap.clear();
    this.chestFixedLoot.clear();
    this.sentinelKilledSet.clear();
    this.manaRefillActive = false;
  }

  create(): void {
    this.cursors  = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.f1Key    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    this.f1Key.on('down', () => {
      if (this.shiftKey.isDown) {
        this.aiDebugOn = !this.aiDebugOn;
        this.events.emit('enemy:setDebugMode', this.aiDebugOn);
      } else {
        this.debugOverlay.toggle();
      }
    });

    this.jKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.pKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.O);

    this.pauseManager = new PauseManager(this);
    this.signPopup    = new SignPopup(this, CANVAS_W, CANVAS_H);
    this.hud          = new HUD(this, this.selectedCharacter);
    this.hud.setPauseCallback(() => this.pauseManager.toggle());
    this.pauseManager.setOnPauseStateChange((paused) => this.hud.setPauseState(paused));
    this.debugOverlay = new DebugOverlay(this);

    // Wire enemy respawn: re-attach wall collider if enemy is in the current room
    this.events.on('enemy:respawned', (enemy: Enemy) => {
      const currentRoomEnemies = this.enemyMap.get(this.currentRoom.roomData.id) ?? [];
      if (currentRoomEnemies.includes(enemy)) {
        enemy.wireWallCollider(this.currentRoom.getPhysicsGroup());
      } else {
        enemy.setVisualVisible(false);
      }
    });

    // Wire projectile spawning (fired by InfiniteLoop)
    this.events.on('enemy:spawnProjectile', (data: SpawnProjectileData) => {
      const proj = new EnemyProjectile(this, data.x, data.y, data.dirX, data.dirY, data.damage);
      proj.setupWallCollision(this.currentRoom.getPhysicsGroup());
      this.activeProjectiles.push(proj);
    });

    this.loadRoom(
      ALL_ROOMS[this.LEVEL_SPAWN.roomId],
      { x: this.LEVEL_SPAWN.tileX, y: this.LEVEL_SPAWN.tileY },
    );
  }

  update(time: number, delta: number): void {
    this.pauseManager.checkInput();
    if (this.pauseManager.isPaused()) return;
    if (this.transitioning) return;

    // ── O key: sign popup + chest interaction ─────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (this.signPopupOpen) {
        this.signPopup.hide();
        this.signPopupOpen = false;
        this.player.enableInput();
      } else {
        const tx = this.player.getTileX();
        const ty = this.player.getTileY();
        const adjacent = [
          { x: tx + 1, y: ty },
          { x: tx - 1, y: ty },
          { x: tx,     y: ty + 1 },
          { x: tx,     y: ty - 1 },
        ];
        let signText: string | null = null;
        for (const t of adjacent) {
          const tFlags = this.currentRoom.getFlagsAt(
            PLAYFIELD_X + t.x * TILE_SIZE + TILE_SIZE / 2,
            PLAYFIELD_Y + t.y * TILE_SIZE + TILE_SIZE / 2,
          );
          if (tFlags & TileFlag.Sign) {
            signText = this.currentRoom.roomData.signs?.[`${t.x},${t.y}`] ?? '...';
            break;
          }
        }
        if (signText !== null) {
          this.signPopup.show(signText);
          this.signPopupOpen = true;
          this.player.disableInput();
          (this.player.getPhysicsObject().body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        } else {
          for (const chest of this.chestMap.get(this.currentRoom.roomData.id) ?? []) {
            if (!chest.isOpen()) {
              const dx = chest.getX() - this.player.getX();
              const dy = chest.getY() - this.player.getY();
              if (Math.sqrt(dx * dx + dy * dy) <= 48 && this.inventory.useKey(chest.getTier())) {
                chest.open();
                const pool     = chest.getTier() === 'gold'   ? GOLD_POOL
                               : chest.getTier() === 'silver' ? SILVER_POOL
                               : BRONZE_POOL;
                const chestDef = this.currentRoom.roomData.chests
                  ?.find(c => c.tileX === Math.round((chest.getX() - PLAYFIELD_X - TILE_SIZE / 2) / TILE_SIZE)
                           && c.tileY === Math.round((chest.getY() - PLAYFIELD_Y - TILE_SIZE / 2) / TILE_SIZE));
                const lootDef = chestDef?.fixedLoot
                  ? LOOT_TABLE.find(l => l.id === chestDef.fixedLoot)!
                  : rollLoot(pool);
                const lootItem = new LootItem(this, chest.getX(), chest.getY() + 32, lootDef);
                const roomLoot = this.lootMap.get(this.currentRoom.roomData.id) ?? [];
                roomLoot.push(lootItem);
                this.lootMap.set(this.currentRoom.roomData.id, roomLoot);
                break;
              }
            }
          }
        }
      }
    }
    if (this.signPopupOpen) return;

    const px    = this.player.getX();
    const py    = this.player.getY();
    const flags = this.currentRoom.getFlagsAt(px, py);

    this.player.applyTerrainEffect(flags);
    this.player.applyTerrainTicks(flags, delta);
    this.player.update(this.cursors, this.wasd);

    // ── Combat input ──────────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.jKey)) this.player.trySwingSword();
    if (Phaser.Input.Keyboard.JustDown(this.pKey)) this.player.tryWhirlingSlash();

    // ── Sentinel trigger + permanent-kill tracking ────────────────────────────
    const currentSentinels = this.sentinelMap.get(this.currentRoom.roomData.id) ?? [];
    for (const sentinel of currentSentinels) {
      if (!sentinel.isSpawned() && !sentinel.isDead()) {
        const sx  = sentinel.getX() - this.player.getX();
        const sy  = sentinel.getY() - this.player.getY();
        if (Math.sqrt(sx * sx + sy * sy) <= 96) {
          sentinel.spawn();
          sentinel.wireWallCollider(this.currentRoom.getPhysicsGroup());
        }
      }
      // Sentinels don't respawn — cancel the base-class respawn timer immediately on death
      if (sentinel.isDead() && !this.sentinelKilledSet.has(sentinel)) {
        this.sentinelKilledSet.add(sentinel);
        sentinel.forceDestroy();
      }
    }

    // Spawned sentinels join the standard combat target list
    const currentEnemies: Enemy[] = [
      ...(this.enemyMap.get(this.currentRoom.roomData.id) ?? []),
      ...currentSentinels.filter(s => s.isSpawned()),
    ];

    // ── Enemy updates + drop tracking ────────────────────────────────────────
    for (const enemy of currentEnemies) {
      if (!enemy.isDead()) enemy.update(time, delta, this.player, this.currentRoom);
      if (enemy.isDead() && !this.droppedSet.has(enemy)) {
        this.droppedSet.add(enemy);
        // Sentinel always drops chicken nuggets; regular enemies use random drop table
        const drop = enemy instanceof Sentinel
          ? LOOT_TABLE.find(l => l.id === 'nuggets')!
          : rollEnemyDrop();
        if (drop) {
          const lootItem = new LootItem(this, enemy.getX(), enemy.getY(), drop);
          const roomLoot = this.lootMap.get(this.currentRoom.roomData.id) ?? [];
          roomLoot.push(lootItem);
          this.lootMap.set(this.currentRoom.roomData.id, roomLoot);
        }
      }
    }

    // ── Sword hit detection ───────────────────────────────────────────────────
    const swordHitbox = this.player.getSwordHitbox();
    if (swordHitbox && !this.player.isSwordHitConnected()) {
      for (const enemy of currentEnemies) {
        if (!enemy.isDead() && this.aabbOverlap(swordHitbox, enemy.getPhysicsCarrier())) {
          this.player.markSwordHitConnected();
          const dx  = enemy.getX() - this.player.getX();
          const dy  = enemy.getY() - this.player.getY();
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          enemy.takeDamage(20, { x: dx / len, y: dy / len });
          break;
        }
      }
    }

    // ── Whirling Slash hit detection ──────────────────────────────────────────
    const slashHitbox = this.player.getBashHitbox();
    if (slashHitbox) {
      for (const enemy of currentEnemies) {
        if (!enemy.isDead() && !this.player.wasSlashHit(enemy) &&
            this.aabbOverlap(slashHitbox, enemy.getPhysicsCarrier())) {
          this.player.markSlashHit(enemy);
          const dx  = enemy.getX() - this.player.getX();
          const dy  = enemy.getY() - this.player.getY();
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          enemy.takeDamage(21, { x: dx / len, y: dy / len });
        }
      }
    }

    // ── Contact damage (enemy → player) ───────────────────────────────────────
    if (!this.player.isInvincible() && !this.player.isDead()) {
      for (const enemy of currentEnemies) {
        if (!enemy.isDead()) {
          if (this.aabbOverlap(this.player.getPhysicsObject(), enemy.getPhysicsCarrier())) {
            this.player.takeDamage(enemy.getContactDamage());
            if (this.player.isDead()) {
              this.transitioning = true;
              return;
            }
            break;
          }
        }
      }
    }

    // ── Sentinel strike hitbox damage ────────────────────────────────────────
    if (!this.player.isInvincible() && !this.player.isDead()) {
      for (const sentinel of currentSentinels) {
        if (!sentinel.isSpawned() || sentinel.isDead()) continue;
        const sh = sentinel.getStrikeHitbox();
        if (sh && this.aabbOverlap(sh, this.player.getPhysicsObject())) {
          this.player.takeDamage(15);
          if (this.player.isDead()) { this.transitioning = true; return; }
        }
      }
    }

    // ── Projectile updates & overlap ──────────────────────────────────────────
    this.activeProjectiles = this.activeProjectiles.filter(p => p.isAlive());
    for (const proj of this.activeProjectiles) {
      proj.update();
      if (!this.player.isInvincible() && !this.player.isDead()) {
        if (this.aabbOverlap(proj.getPhysicsCarrier(), this.player.getPhysicsObject())) {
          const dmg = proj.getDamage();
          proj.destroy();
          this.player.takeDamage(dmg);
          if (this.player.isDead()) {
            this.transitioning = true;
            return;
          }
        }
      }
    }

    // ── Loot pickup ───────────────────────────────────────────────────────────
    for (const item of this.lootMap.get(this.currentRoom.roomData.id) ?? []) {
      if (item.isCollected()) continue;
      if (this.aabbOverlap(this.player.getPhysicsObject(), item.getPhysicsCarrier())) {
        item.collect();
        const def = item.getDef();
        if (def.type === 'hp') this.player.heal(def.restore);
        if (def.type === 'mp') this.player.restoreMP(def.restore);
      }
    }

    // ── Mana shrine proximity ─────────────────────────────────────────────────
    const currentShrines = this.shrineMap.get(this.currentRoom.roomData.id) ?? [];
    for (let i = 0; i < currentShrines.length; i++) {
      const shrine   = currentShrines[i];
      if (shrine.isActivated()) continue;
      const roomDef  = this.currentRoom.roomData.manaShrines?.[i];
      if (!roomDef) continue;
      const sx  = shrine.getX() - this.player.getX();
      const sy  = shrine.getY() - this.player.getY();
      if (Math.sqrt(sx * sx + sy * sy) <= 48 && this.player.getMP() >= roomDef.mpCost) {
        this.player.spendMP(roomDef.mpCost);
        shrine.activate();
        const barrierGroup = this.barrierMap.get(roomDef.triggersBarrier);
        if (barrierGroup) {
          barrierGroup.clear(true, true);
          this.barrierMap.delete(roomDef.triggersBarrier);
          // Hide the Z-tile visuals that belong to this barrier
          const barrierDef = this.currentRoom.roomData.barriers?.find(
            b => b.id === roomDef.triggersBarrier,
          );
          if (barrierDef) {
            for (const t of barrierDef.tiles) {
              this.currentRoom.getVisualRectAt(t.x, t.y)?.setVisible(false);
            }
          }
        }
        this.manaRefillActive = false;
      }
    }

    // ── Mana refill for room_01 (spawns mp_large if player runs dry before shrine) ──
    if (this.currentRoom.roomData.id === 'room_01') {
      const barrier = this.barrierMap.get('barrier_01');
      if (barrier && this.player.getMP() === 0 && !this.manaRefillActive) {
        this.manaRefillActive = true;
        const def     = LOOT_TABLE.find(l => l.id === 'mp_large')!;
        const refill  = new LootItem(this,
          PLAYFIELD_X + 17 * TILE_SIZE + TILE_SIZE / 2,
          PLAYFIELD_Y + 13 * TILE_SIZE + TILE_SIZE / 2,
          def,
        );
        const roomLoot = this.lootMap.get('room_01') ?? [];
        roomLoot.push(refill);
        this.lootMap.set('room_01', roomLoot);
      }
    }

    // ── Tile checks ───────────────────────────────────────────────────────────
    const tx = this.player.getTileX();
    const ty = this.player.getTileY();

    const door = this.currentRoom.getDoorAt(tx, ty);
    if (door) {
      const sentinels   = this.sentinelMap.get(this.currentRoom.roomData.id) ?? [];
      const roomEnemies = this.enemyMap.get(this.currentRoom.roomData.id) ?? [];
      // Block until sentinel is in killedSet (authoritative — isDead() alone fires in kill frame)
      if (sentinels.some(s => s.isSpawned() && !this.sentinelKilledSet.has(s))) return;
      if (roomEnemies.length > 0 && !roomEnemies.every(e => e.isDead())) return;
      this.startTransition(door, this.slideDir(tx, ty));
      return;
    }

    if (flags & TileFlag.PressurePlate) {
      const key = `${tx},${ty}`;
      if (!this.triggeredPlates.has(key)) {
        this.triggeredPlates.add(key);
        this.activatePressurePlate(tx, ty);
      }
    }

    // ── Key pickup ────────────────────────────────────────────────────────────
    for (const item of this.keyMap.get(this.currentRoom.roomData.id) ?? []) {
      if (!item.isCollected() && this.aabbOverlap(this.player.getPhysicsObject(), item.getPhysicsCarrier())) {
        item.collect();
        this.inventory.addKey(item.getTier());
      }
    }

    // ── HUD update ────────────────────────────────────────────────────────────
    this.hud.setHP(this.player.getHP(), this.player.getMaxHP());
    this.hud.setMP(this.player.getMP(), this.player.getMaxMP());
    this.hud.updateKeys(
      this.inventory.getKeys('bronze'),
      this.inventory.getKeys('silver'),
      this.inventory.getKeys('gold'),
    );

    this.debugOverlay.update(this.player, this.currentRoom, currentEnemies);
  }

  // ── Room loading ─────────────────────────────────────────────────────────────

  private loadRoom(roomData: RoomData, spawnTile: { x: number; y: number }): void {
    const spawnX = PLAYFIELD_X + spawnTile.x * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = PLAYFIELD_Y + spawnTile.y * TILE_SIZE + TILE_SIZE / 2;

    this.currentRoom = new Room(this, roomData, PLAYFIELD_X, PLAYFIELD_Y);

    if (!this.player) {
      this.player = new Player(
        this,
        this.selectedCharacter,
        spawnX,
        spawnY,
        PLAYFIELD_X,
        PLAYFIELD_Y,
      );
      this.player.onDeath = () => this.performRespawn();
    } else {
      this.player.setPosition(spawnX, spawnY);
    }

    this.currentCollider = this.physics.add.collider(
      this.player.getPhysicsObject(),
      this.currentRoom.getPhysicsGroup(),
    );

    this.hud.setRoomName(roomData.name);
    this.triggeredPlates.clear();
    this.activateRoom(roomData);

    const enemies = this.getOrCreateRoomEnemies(roomData.id);
    for (const enemy of enemies) {
      if (!enemy.isDead()) {
        enemy.wireWallCollider(this.currentRoom.getPhysicsGroup());
      }
    }
  }

  // ── Enemy management ─────────────────────────────────────────────────────────

  private getOrCreateRoomEnemies(roomId: string): Enemy[] {
    if (!this.enemyMap.has(roomId)) {
      this.enemyMap.set(roomId, this.createEnemiesForRoom(roomId));
    }
    return this.enemyMap.get(roomId)!;
  }

  private createEnemiesForRoom(roomId: string): Enemy[] {
    if (roomId === 'room_01') {
      return []; // Sentinel is managed separately via sentinelMap
    }
    if (roomId === 'room_02') {
      return [new StackOverflow(
        this,
        PLAYFIELD_X +  4 * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y + 13 * TILE_SIZE + TILE_SIZE / 2,
      )];
    }
    if (roomId === 'room_03') {
      return [new InfiniteLoop(
        this,
        PLAYFIELD_X + 24 * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y + 12 * TILE_SIZE + TILE_SIZE / 2,
      )];
    }
    if (roomId === 'room_04') {
      return [new StackOverflow(
        this,
        PLAYFIELD_X + 15 * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y +  8 * TILE_SIZE + TILE_SIZE / 2,
      )];
    }
    if (roomId === 'room_05') {
      return [
        new NullPointer(this, PLAYFIELD_X +  8 * TILE_SIZE + TILE_SIZE / 2, PLAYFIELD_Y + 7 * TILE_SIZE + TILE_SIZE / 2),
        new NullPointer(this, PLAYFIELD_X + 12 * TILE_SIZE + TILE_SIZE / 2, PLAYFIELD_Y + 9 * TILE_SIZE + TILE_SIZE / 2),
      ];
    }
    if (roomId === 'room_07') {
      return [new InfiniteLoop(
        this,
        PLAYFIELD_X + 22 * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y +  8 * TILE_SIZE + TILE_SIZE / 2,
      )];
    }
    if (roomId === 'room_09') {
      return [
        new NullPointer(this,   PLAYFIELD_X +  3 * TILE_SIZE + TILE_SIZE / 2, PLAYFIELD_Y +  2 * TILE_SIZE + TILE_SIZE / 2),
        new StackOverflow(this, PLAYFIELD_X + 26 * TILE_SIZE + TILE_SIZE / 2, PLAYFIELD_Y + 14 * TILE_SIZE + TILE_SIZE / 2),
        new InfiniteLoop(this,  PLAYFIELD_X + 26 * TILE_SIZE + TILE_SIZE / 2, PLAYFIELD_Y +  2 * TILE_SIZE + TILE_SIZE / 2),
      ];
    }
    if (roomId === 'room_10') {
      return [
        new NullPointer(this,  PLAYFIELD_X + 13 * TILE_SIZE + TILE_SIZE / 2, PLAYFIELD_Y + 6 * TILE_SIZE + TILE_SIZE / 2),
        new InfiniteLoop(this, PLAYFIELD_X + 17 * TILE_SIZE + TILE_SIZE / 2, PLAYFIELD_Y + 6 * TILE_SIZE + TILE_SIZE / 2),
      ];
    }
    if (roomId === 'room_11') {
      return [new StackOverflow(
        this,
        PLAYFIELD_X + 15 * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y +  8 * TILE_SIZE + TILE_SIZE / 2,
      )];
    }
    return [];
  }

  private resetAllEnemies(): void {
    for (const enemies of this.enemyMap.values()) {
      for (const enemy of enemies) {
        enemy.forceDestroy();
      }
    }
    this.enemyMap.clear();
  }

  private destroyActiveProjectiles(): void {
    for (const proj of this.activeProjectiles) {
      proj.destroy();
    }
    this.activeProjectiles = [];
  }

  // ── Player respawn ────────────────────────────────────────────────────────────

  private performRespawn(): void {
    this.currentCollider.destroy();
    this.destroyActiveProjectiles();
    this.resetAllEnemies();

    const spawnRoomData = ALL_ROOMS[this.LEVEL_SPAWN.roomId];
    const oldRoom       = this.currentRoom;
    this.currentRoom    = new Room(this, spawnRoomData, PLAYFIELD_X, PLAYFIELD_Y);

    const spawnX = PLAYFIELD_X + this.LEVEL_SPAWN.tileX * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = PLAYFIELD_Y + this.LEVEL_SPAWN.tileY * TILE_SIZE + TILE_SIZE / 2;
    this.player.respawn(spawnX, spawnY);

    this.currentCollider = this.physics.add.collider(
      this.player.getPhysicsObject(),
      this.currentRoom.getPhysicsGroup(),
    );

    this.hud.setRoomName(spawnRoomData.name);
    this.triggeredPlates.clear();
    oldRoom.destroy();

    // ── Reset keys, chests, and inventory ────────────────────────────────────
    for (const items  of this.keyMap.values())   for (const item  of items)  item.destroy();
    this.keyMap.clear();
    for (const chests of this.chestMap.values())  for (const chest of chests) chest.destroy();
    this.chestMap.clear();
    for (const col of this.chestColliders) col.destroy();
    this.chestColliders = [];
    this.inventory.reset();
    for (const items of this.lootMap.values())  for (const item of items) item.destroy();
    this.lootMap.clear();
    this.droppedSet.clear();
    for (const group of this.barrierMap.values()) group.clear(true, true);
    this.barrierMap.clear();
    for (const shrines   of this.shrineMap.values())   for (const s of shrines)   s.destroy();
    this.shrineMap.clear();
    for (const sentinels of this.sentinelMap.values()) {
      for (const s of sentinels) {
        if (!this.sentinelKilledSet.has(s)) s.forceDestroy();
      }
    }
    this.sentinelMap.clear();
    this.chestFixedLoot.clear();
    this.sentinelKilledSet.clear();
    this.manaRefillActive = false;
    this.activateRoom(spawnRoomData);
    this.hud.updateKeys(0, 0, 0);

    const enemies = this.getOrCreateRoomEnemies(this.LEVEL_SPAWN.roomId);
    for (const enemy of enemies) {
      if (!enemy.isDead()) {
        enemy.wireWallCollider(this.currentRoom.getPhysicsGroup());
      }
    }

    this.transitioning        = false;
    this.transitionInProgress = false;
  }

  // ── Room transitions ──────────────────────────────────────────────────────────

  private slideDir(tileX: number, tileY: number): SlideDir {
    if (tileY === 0)                     return 'north';
    if (tileY === ROOM_HEIGHT_TILES - 1) return 'south';
    if (tileX === 0)                     return 'west';
    return 'east';
  }

  private startTransition(dest: DoorTarget, dir: SlideDir): void {
    if (this.transitionInProgress) return;   // race condition guard

    const destRoomData = ALL_ROOMS[dest.roomId];
    if (!destRoomData) return;

    this.transitionInProgress = true;
    this.transitioning        = true;
    this.player.disableInput();
    this.currentCollider.destroy();

    // Clear wall colliders for leaving-room enemies
    const leavingEnemies = this.enemyMap.get(this.currentRoom.roomData.id) ?? [];
    for (const enemy of leavingEnemies) enemy.clearWallCollider();

    this.destroyActiveProjectiles();

    const oldContainer = this.currentRoom.getContainer();
    const newRoom      = new Room(this, destRoomData, PLAYFIELD_X, PLAYFIELD_Y);
    const newContainer = newRoom.getContainer();

    const dx = dir === 'east' ? -CANVAS_W : dir === 'west' ?  CANVAS_W : 0;
    const dy = dir === 'north' ?  CANVAS_H : dir === 'south' ? -CANVAS_H : 0;

    newContainer.setPosition(PLAYFIELD_X - dx, PLAYFIELD_Y - dy);

    this.tweens.add({
      targets: oldContainer,
      x: PLAYFIELD_X + dx,
      y: PLAYFIELD_Y + dy,
      duration: 400,
      ease: 'Quad.easeInOut',
    });

    this.tweens.add({
      targets: newContainer,
      x: PLAYFIELD_X,
      y: PLAYFIELD_Y,
      duration: 400,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        const oldRoom    = this.currentRoom;
        this.currentRoom = newRoom;

        const spawnX = PLAYFIELD_X + dest.spawnTile.x * TILE_SIZE + TILE_SIZE / 2;
        const spawnY = PLAYFIELD_Y + dest.spawnTile.y * TILE_SIZE + TILE_SIZE / 2;
        this.player.setPosition(spawnX, spawnY);

        this.currentCollider = this.physics.add.collider(
          this.player.getPhysicsObject(),
          this.currentRoom.getPhysicsGroup(),
        );

        this.hud.setRoomName(destRoomData.name);
        this.triggeredPlates.clear();
        oldRoom.destroy();
        this.activateRoom(destRoomData);

        // Wire colliders for entering-room enemies; hide others
        const enteringEnemies = this.getOrCreateRoomEnemies(dest.roomId);
        for (const enemy of enteringEnemies) {
          if (!enemy.isDead()) {
            enemy.wireWallCollider(this.currentRoom.getPhysicsGroup());
          }
        }
        for (const [roomId, roomEnemies] of this.enemyMap) {
          const visible = roomId === dest.roomId;
          for (const enemy of roomEnemies) enemy.setVisualVisible(visible);
        }

        this.player.enableInput();
        this.transitioning        = false;
        this.transitionInProgress = false;
      },
    });
  }

  // ── Pressure plate ────────────────────────────────────────────────────────────

  private activatePressurePlate(tileX: number, tileY: number): void {
    this.currentRoom.triggerPressurePlate(tileX, tileY);

    const rect = this.currentRoom.getVisualRectAt(tileX, tileY);
    if (rect) {
      const origColor = 0x1a4a6a;
      rect.setFillStyle(0x88ddff);
      this.time.delayedCall(180, () => { rect.setFillStyle(origColor); });
    }
  }

  // ── Key / chest room activation ───────────────────────────────────────────────

  private activateRoom(roomData: RoomData): void {
    if (!this.keyMap.has(roomData.id)) {
      this.keyMap.set(roomData.id, (roomData.keys ?? []).map(kd =>
        new KeyItem(
          this,
          PLAYFIELD_X + kd.tileX * TILE_SIZE + TILE_SIZE / 2,
          PLAYFIELD_Y + kd.tileY * TILE_SIZE + TILE_SIZE / 2,
          kd.tier,
        )
      ));
    }
    if (!this.chestMap.has(roomData.id)) {
      const chests = (roomData.chests ?? []).map(cd => {
        const chest = new Chest(
          this,
          PLAYFIELD_X + cd.tileX * TILE_SIZE + TILE_SIZE / 2,
          PLAYFIELD_Y + cd.tileY * TILE_SIZE + TILE_SIZE / 2,
          cd.tier,
        );
        if (cd.fixedLoot) this.chestFixedLoot.set(chest, cd.fixedLoot);
        return chest;
      });
      this.chestMap.set(roomData.id, chests);
    }

    // ── Barrier physics groups ────────────────────────────────────────────────
    if (!this.barrierMap.has(roomData.id + '_checked') && roomData.barriers) {
      for (const barrier of roomData.barriers) {
        if (this.barrierMap.has(barrier.id)) continue;
        const group = this.physics.add.staticGroup();
        for (const t of barrier.tiles) {
          const wx   = PLAYFIELD_X + t.x * TILE_SIZE + TILE_SIZE / 2;
          const wy   = PLAYFIELD_Y + t.y * TILE_SIZE + TILE_SIZE / 2;
          const tile = this.physics.add.staticImage(wx, wy, '__DEFAULT');
          tile.setVisible(false);
          (tile.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE_SIZE, TILE_SIZE);
          tile.refreshBody();
          group.add(tile);
        }
        this.barrierMap.set(barrier.id, group);
        this.physics.add.collider(this.player.getPhysicsObject(), group);
      }
      this.barrierMap.set(roomData.id + '_checked', this.physics.add.staticGroup());
    }

    // ── Mana shrines ──────────────────────────────────────────────────────────
    if (!this.shrineMap.has(roomData.id) && roomData.manaShrines) {
      const shrines = roomData.manaShrines.map(s => new ManaShrine(
        this,
        PLAYFIELD_X + s.tileX * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y + s.tileY * TILE_SIZE + TILE_SIZE / 2,
      ));
      this.shrineMap.set(roomData.id, shrines);
      for (const shrine of shrines) {
        this.physics.add.collider(this.player.getPhysicsObject(), shrine.getCarrier());
      }
    }

    // ── Sentinels (dormant until triggered) ───────────────────────────────────
    if (!this.sentinelMap.has(roomData.id) && roomData.sentinelTriggers) {
      const sentinels = roomData.sentinelTriggers.map(t => new Sentinel(
        this,
        PLAYFIELD_X + t.tileX * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y + t.tileY * TILE_SIZE + TILE_SIZE / 2,
      ));
      this.sentinelMap.set(roomData.id, sentinels);
    }

    for (const [rid, items]  of this.keyMap)   for (const item  of items)  item.setVisible(rid === roomData.id);
    for (const [rid, chests] of this.chestMap)  for (const chest of chests) chest.setVisible(rid === roomData.id);
    for (const [rid, loots]  of this.lootMap)   for (const loot  of loots)  loot.setVisible(rid === roomData.id);

    for (const col of this.chestColliders) col.destroy();
    this.chestColliders = [];
    for (const chest of this.chestMap.get(roomData.id) ?? []) {
      if (!chest.isOpen()) {
        this.chestColliders.push(
          this.physics.add.collider(this.player.getPhysicsObject(), chest.getPhysicsCarrier())
        );
      }
    }
  }

  // ── Physics helpers ───────────────────────────────────────────────────────────

  private aabbOverlap(
    a: Phaser.Physics.Arcade.Image,
    b: Phaser.Physics.Arcade.Image,
  ): boolean {
    const ba = a.body;
    const bb = b.body;
    if (!ba || !bb) return false;
    return ba.right > bb.left && ba.left < bb.right
        && ba.bottom > bb.top && ba.top < bb.bottom;
  }
}
