import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { TILE_SIZE } from './dungeon.js';

const NPC_HEIGHT = TILE_SIZE * 0.8;
const NPC_WIDTH = TILE_SIZE * 0.5;

class BaseNPC {
    constructor(scene, map, mapWidth, mapHeight, color = 0xff0000) {
        this.scene = scene;
        this.map = map; // The dungeon map grid
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.speed = 0.05 * TILE_SIZE; // Movement speed relative to tile size
        this.health = 100;
        this.target = null; // Target NPC for combat/movement
        this.attackRange = TILE_SIZE * 1.5; // How close to attack
        this.attackDamage = 10;
        this.attackCooldown = 1000; // Milliseconds between attacks
        this.lastAttackTime = 0;
        this.aggroRange = TILE_SIZE * 8; // How close to notice enemies
        this.isPlayer = false; // Flag to distinguish player/monster for targeting

        // Find a valid spawn point (floor tile)
        let spawnPos = this.findValidSpawn();
        if (!spawnPos) {
            console.error("Could not find valid spawn point for NPC!");
            // Handle error appropriately, maybe retry or place at default
            spawnPos = { x: 0, z: 0 }; // Fallback
        }

        // Create 3D representation (simple cube for now)
        const geometry = new THREE.BoxGeometry(NPC_WIDTH, NPC_HEIGHT, NPC_WIDTH);
        const material = new THREE.MeshStandardMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.set(spawnPos.x, NPC_HEIGHT / 2, spawnPos.z); // Position centered on tile, slightly above floor
        scene.add(this.mesh);

        console.log(`NPC created at ${spawnPos.x.toFixed(2)}, ${spawnPos.z.toFixed(2)}`);
    }

    // Find a random floor tile (0) on the map to spawn
    findValidSpawn() {
        let attempts = 0;
        const maxAttempts = this.mapWidth * this.mapHeight; // Avoid infinite loop

        while (attempts < maxAttempts) {
            const gridY = Math.floor(Math.random() * this.mapHeight);
            const gridX = Math.floor(Math.random() * this.mapWidth);

            if (this.map[gridY] && this.map[gridY][gridX] === 0) { // Check if it's a floor tile
                const worldX = (gridX - this.mapWidth / 2) * TILE_SIZE;
                const worldZ = (gridY - this.mapHeight / 2) * TILE_SIZE;
                return { x: worldX, z: worldZ };
            }
            attempts++;
        }
        return null; // No valid spawn found
    }

    // Find nearest enemy NPC
    findTarget(allNPCs) {
        let closestTarget = null;
        let minDistanceSq = this.aggroRange * this.aggroRange; // Use squared distance for efficiency

        allNPCs.forEach(npc => {
            // Target logic: Player targets monsters, monsters target player
            if (npc !== this && npc.health > 0 && npc.isPlayer !== this.isPlayer) {
                const distanceSq = this.mesh.position.distanceToSquared(npc.mesh.position);
                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    closestTarget = npc;
                }
            }
        });
        this.target = closestTarget;
    }

    // Update movement and combat logic
    update(allNPCs) {
        if (this.health <= 0) return; // Don't update dead NPCs

        // 1. Find Target
        if (!this.target || this.target.health <= 0) { // If no target or target is dead
            this.findTarget(allNPCs);
        }

        // 2. Move and Attack
        if (this.target) {
            const distanceToTarget = this.mesh.position.distanceTo(this.target.mesh.position);

            // Move towards target if not in attack range
            if (distanceToTarget > this.attackRange) {
                const moveDirection = new THREE.Vector3().subVectors(this.target.mesh.position, this.mesh.position).normalize();
                const potentialNewPos = this.mesh.position.clone().add(moveDirection.multiplyScalar(this.speed));

                // Basic Collision Detection
                const gridX = Math.floor((potentialNewPos.x / TILE_SIZE) + (this.mapWidth / 2));
                const gridY = Math.floor((potentialNewPos.z / TILE_SIZE) + (this.mapHeight / 2));

                if (this.map[gridY] && this.map[gridY][gridX] === 0) {
                    this.mesh.position.copy(potentialNewPos);
                }
                // Optional: Make NPC face the target
                this.mesh.lookAt(this.target.mesh.position.x, this.mesh.position.y, this.target.mesh.position.z); // Look at target on same Y plane

            } else {
                // Attack if in range and cooldown ready
                const now = Date.now();
                if (now - this.lastAttackTime > this.attackCooldown) {
                    this.attack(this.target);
                    this.lastAttackTime = now;
                }
            }
        } else {
            // No target - optional random wandering (or stay put)
            // this.randomWander(); // Could implement this separately
        }
    }

    // Attack a target NPC
    attack(target) {
        console.log(`${this.constructor.name} attacks ${target.constructor.name}`);
        target.takeDamage(this.attackDamage);
    }

    // Taking damage
    takeDamage(amount) {
        this.health -= amount;
        console.log(`NPC took ${amount} damage, health: ${this.health}`);
        if (this.health <= 0) {
            this.die();
        }
    }

    // Death
    die() {
        console.log(`${this.constructor.name} died`);
        this.scene.remove(this.mesh);
        // Note: The NPC object still exists in the 'npcs' array in game.js,
        // but its health is <= 0, so it won't be updated or targeted.
        // Could splice it from the array for cleanup if needed.
    }
}

export class PlayerNPC extends BaseNPC {
    constructor(scene, map, mapWidth, mapHeight) {
        super(scene, map, mapWidth, mapHeight, 0x0000ff); // Blue color for player
        this.isPlayer = true; // Identify as player
        console.log("Player NPC initialized.");
    }

    // Override update or add player-specific behaviors if needed
    update(allNPCs) {
        super.update(allNPCs); // Call base class update logic
    }
}

export class MonsterNPC extends BaseNPC {
    constructor(scene, map, mapWidth, mapHeight) {
        super(scene, map, mapWidth, mapHeight, 0xff0000); // Red color for monster
        this.isPlayer = false; // Identify as monster
        console.log("Monster NPC initialized.");
    }

    // Override update or add monster-specific behaviors if needed
    update(allNPCs) {
        super.update(allNPCs); // Call base class update logic
    }
}
