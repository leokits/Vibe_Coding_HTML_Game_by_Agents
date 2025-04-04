// NOTE: THREE and TILE_SIZE are now globally available

const NPC_HEIGHT = TILE_SIZE * 0.8;
const NPC_WIDTH = TILE_SIZE * 0.5;

class BaseNPC {
    // Constructor now accepts texture OR color
    constructor(scene, map, mapWidth, mapHeight, textureOrColor) {
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
        this.aggroRange = TILE_SIZE * 25; // Increased range (was 8) -> 50 units
        this.isPlayer = false; // Flag to distinguish player/monster for targeting
        this.maxHealth = 100; // Store max health
        this.health = this.maxHealth; // Start at full health

        // Stuck detection properties
        this.lastPosition = new THREE.Vector3(); // Store last position
        this.stuckTimer = 0; // Time spent potentially stuck
        this.stuckCheckInterval = 0.5; // Seconds between checks
        this.stuckThreshold = 1.5; // Seconds before considered stuck
        this.lastStuckCheckTime = 0; // Track time for interval

        // Find a valid spawn point (floor tile)
        let spawnPos = this.findValidSpawn();
        if (!spawnPos) {
            console.error("Could not find valid spawn point for NPC!");
            spawnPos = { x: 0, z: 0 }; // Fallback
        }

        // Create 2D Sprite representation using texture or color
        const materialConfig = {};
        if (textureOrColor instanceof THREE.Texture) {
            materialConfig.map = textureOrColor;
            materialConfig.transparent = true; // Assume texture has transparency
        } else {
            materialConfig.color = textureOrColor; // Fallback to color
        }
        const spriteMaterial = new THREE.SpriteMaterial(materialConfig);

        this.mesh = new THREE.Sprite(spriteMaterial); // Using 'mesh' variable name for simplicity
        this.mesh.scale.set(TILE_SIZE * 0.7, TILE_SIZE * 0.7, 1);
        this.mesh.position.set(spawnPos.x, TILE_SIZE * 0.5, spawnPos.z);
        scene.add(this.mesh);
        this.lastPosition.copy(this.mesh.position); // Initialize last position

        // Create Health Bar HTML Elements
        this.healthBarContainer = document.createElement('div');
        this.healthBarContainer.className = 'health-bar-container';
        this.healthBarFill = document.createElement('div');
        this.healthBarFill.className = 'health-bar-fill';
        this.healthBarContainer.appendChild(this.healthBarFill);
        document.body.appendChild(this.healthBarContainer); // Add to body

        console.log(`NPC sprite created at ${spawnPos.x.toFixed(2)}, ${spawnPos.z.toFixed(2)}`);
    }

    findValidSpawn() {
        let attempts = 0;
        const maxAttempts = this.mapWidth * this.mapHeight;
        while (attempts < maxAttempts) {
            const gridY = Math.floor(Math.random() * this.mapHeight);
            const gridX = Math.floor(Math.random() * this.mapWidth);
            if (this.map[gridY] && this.map[gridY][gridX] === 0) {
                const worldX = (gridX - this.mapWidth / 2 + 0.5) * TILE_SIZE;
                const worldZ = (gridY - this.mapHeight / 2 + 0.5) * TILE_SIZE;
                return { x: worldX, z: worldZ };
            }
            attempts++;
        }
        return null;
    }

    // --- Coordinate Conversion Helpers ---
    worldToGrid(worldPos) {
        const gridX = Math.floor((worldPos.x / TILE_SIZE) + (this.mapWidth / 2));
        const gridY = Math.floor((worldPos.z / TILE_SIZE) + (this.mapHeight / 2));
        const clampedX = Math.max(0, Math.min(this.mapWidth - 1, gridX));
        const clampedY = Math.max(0, Math.min(this.mapHeight - 1, gridY));
        return { x: clampedX, y: clampedY };
    }

    gridToWorld(gridPos) {
        const worldX = (gridPos.x - this.mapWidth / 2 + 0.5) * TILE_SIZE;
        const worldZ = (gridPos.y - this.mapHeight / 2 + 0.5) * TILE_SIZE;
        return new THREE.Vector3(worldX, this.mesh.position.y, worldZ);
    }
    // --- End Coordinate Conversion ---

    // --- Path Following (Placeholder - Not used by current update logic) ---
    followPath() {
        // This function will be used when pathfinding is fully integrated
        return false; // Default to path not being followed
    }
    // --- End Path Following ---

    findTarget(allNPCs) {
        let closestTarget = null;
        let minDistanceSq = this.aggroRange * this.aggroRange;
        allNPCs.forEach(npc => {
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

    // Update logic using simple movement + avoidance + stuck detection
    update(allNPCs) {
        if (this.health <= 0) return;
        const npcId = this.isPlayer ? 'Player' : `Monster_${this.mesh.uuid.substring(0, 4)}`;
        const currentTime = Date.now() / 1000; // Time in seconds

        // --- Stuck Detection Logic ---
        let wasStuckAndTeleported = false;
        // Only check if stuck when actively chasing a target
        if (this.target && currentTime - this.lastStuckCheckTime > this.stuckCheckInterval) {
            const distanceMoved = this.mesh.position.distanceTo(this.lastPosition);
            if (distanceMoved < this.speed * this.stuckCheckInterval * 0.5) { // Moved less than half expected distance
                this.stuckTimer += this.stuckCheckInterval;
            } else {
                this.stuckTimer = 0; // Reset if moved enough
            }
            this.lastPosition.copy(this.mesh.position); // Update last position for next check
            this.lastStuckCheckTime = currentTime;

            if (this.stuckTimer > this.stuckThreshold) {
                console.warn(`${npcId} is stuck! Attempting teleport.`);
                this.teleportToNearestFloor();
                this.stuckTimer = 0; // Reset timer after teleport
                wasStuckAndTeleported = true; // Skip normal movement this frame
            }
        } else if (!this.target) {
             this.stuckTimer = 0; // Reset stuck timer if no target
        }
        // --- End Stuck Detection ---

        // Skip the rest of the update if we just teleported
        if (wasStuckAndTeleported) return;

        // --- 1. Target Acquisition ---
        const hadTarget = !!this.target;
        if (!this.target || this.target.health <= 0) {
            this.findTarget(allNPCs);
            if (this.target && !hadTarget) {
                console.log(`${npcId} found new target: ${this.target.isPlayer ? 'Player' : `Monster_${this.target.mesh.uuid.substring(0, 4)}`}`);
            } else if (!this.target && hadTarget) {
                console.log(`${npcId} lost target.`);
            }
        }

        // --- 2. Action: Attack, Chase, or Wander ---
        if (this.target) {
            // --- Combat Logic ---
            const distanceToTarget = this.mesh.position.distanceTo(this.target.mesh.position);

            if (distanceToTarget <= this.attackRange) {
                // --- Attack ---
                this.mesh.lookAt(this.target.mesh.position.x, this.mesh.position.y, this.target.mesh.position.z);
                const now = Date.now();
                if (now - this.lastAttackTime > this.attackCooldown) {
                    console.log(`${npcId} attacking target!`);
                    this.attack(this.target, allNPCs);
                    this.lastAttackTime = now;
                }
            } else {
                // --- Chase Target using Simple Avoidance ---
                const moveDirection = new THREE.Vector3().subVectors(this.target.mesh.position, this.mesh.position).normalize();
                const potentialNewPos = this.mesh.position.clone().add(moveDirection.multiplyScalar(this.speed));

                // Collision Check with Buffer
                const collisionBuffer = NPC_WIDTH / 2 + 0.01;
                const checkPosX = potentialNewPos.x + moveDirection.x * collisionBuffer;
                const checkPosZ = potentialNewPos.z + moveDirection.z * collisionBuffer;
                const gridPos = this.worldToGrid({x: checkPosX, z: checkPosZ});
                const mapValue = this.map[gridPos.y]?.[gridPos.x];
                const canMove = mapValue === 0;

                if (canMove) {
                    this.mesh.position.copy(potentialNewPos);
                    this.mesh.lookAt(this.target.mesh.position.x, this.mesh.position.y, this.target.mesh.position.z);
                } else {
                    // --- Angled Wall Avoidance Attempt ---
                    const angle = Math.PI / 6; // 30 degrees
                    const cosAngle = Math.cos(angle);
                    const sinAngle = Math.sin(angle);
                    let moved = false;

                    // Try rotating right
                    const moveDirRight = new THREE.Vector3(
                        moveDirection.x * cosAngle - moveDirection.z * sinAngle, 0,
                        moveDirection.x * sinAngle + moveDirection.z * cosAngle
                    ).normalize();
                    let alternatePosRight = this.mesh.position.clone().add(moveDirRight.multiplyScalar(this.speed));
                    let altCheckPosRight = {x: alternatePosRight.x + moveDirRight.x * collisionBuffer, z: alternatePosRight.z + moveDirRight.z * collisionBuffer};
                    let altGridRight = this.worldToGrid(altCheckPosRight);
                    if (this.map[altGridRight.y]?.[altGridRight.x] === 0) {
                        this.mesh.position.copy(alternatePosRight);
                        this.mesh.lookAt(alternatePosRight.x, this.mesh.position.y, alternatePosRight.z);
                        moved = true;
                    }

                    // If right failed, try rotating left
                    if (!moved) {
                        const moveDirLeft = new THREE.Vector3(
                            moveDirection.x * cosAngle + moveDirection.z * sinAngle, 0,
                           -moveDirection.x * sinAngle + moveDirection.z * cosAngle
                        ).normalize();
                         let alternatePosLeft = this.mesh.position.clone().add(moveDirLeft.multiplyScalar(this.speed));
                         let altCheckPosLeft = {x: alternatePosLeft.x + moveDirLeft.x * collisionBuffer, z: alternatePosLeft.z + moveDirLeft.z * collisionBuffer};
                         let altGridLeft = this.worldToGrid(altCheckPosLeft);
                         if (this.map[altGridLeft.y]?.[altGridLeft.x] === 0) {
                              this.mesh.position.copy(alternatePosLeft);
                              this.mesh.lookAt(alternatePosLeft.x, this.mesh.position.y, alternatePosLeft.z);
                              moved = true;
                         }
                    }

                    // If all moves failed, just face target
                    if (!moved) {
                         this.mesh.lookAt(this.target.mesh.position.x, this.mesh.position.y, this.target.mesh.position.z);
                    }
                }
            }
        } else {
            // --- Wander ---
            this.randomWander();
        }
    }

    // Simple random wandering (adjacent tile - Reverted)
    randomWander() {
        const directions = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
        const randomGridMove = directions[Math.floor(Math.random() * directions.length)];
        if (randomGridMove[0] === 0 && randomGridMove[1] === 0) return;

        const currentGridPos = this.worldToGrid(this.mesh.position);
        const nextGridX = currentGridPos.x + randomGridMove[1];
        const nextGridY = currentGridPos.y + randomGridMove[0];

        if (this.map[nextGridY] && this.map[nextGridY][nextGridX] === 0) {
            const targetWorldPos = this.gridToWorld({x: nextGridX, y: nextGridY});
            const moveDirection = new THREE.Vector3().subVectors(targetWorldPos, this.mesh.position).normalize();
            const potentialNewPos = this.mesh.position.clone().add(moveDirection.multiplyScalar(this.speed));
            this.mesh.position.copy(potentialNewPos);
        }
    }

    // --- Stuck Teleport Logic ---
    findNearestFloorTile() {
        const currentGridPos = this.worldToGrid(this.mesh.position);
        let nearestFloor = null;
        let minDistanceSq = Infinity;
        const searchRadius = 5; // How far out to search

        for (let r = -searchRadius; r <= searchRadius; r++) {
            for (let c = -searchRadius; c <= searchRadius; c++) {
                const checkY = currentGridPos.y + r;
                const checkX = currentGridPos.x + c;

                // Check bounds and if it's a floor tile
                if (checkY >= 0 && checkY < this.mapHeight &&
                    checkX >= 0 && checkX < this.mapWidth &&
                    this.map[checkY][checkX] === 0)
                {
                    const distSq = r*r + c*c;
                    if (distSq < minDistanceSq) {
                        minDistanceSq = distSq;
                        nearestFloor = { x: checkX, y: checkY };
                    }
                }
            }
        }
        return nearestFloor; // Returns grid coordinates or null
    }

    teleportToNearestFloor() {
        const nearestFloorGrid = this.findNearestFloorTile();
        if (nearestFloorGrid) {
            const teleportPos = this.gridToWorld(nearestFloorGrid);
            console.log(`Teleporting to nearest floor at grid (${nearestFloorGrid.x}, ${nearestFloorGrid.y}) -> world (${teleportPos.x.toFixed(2)}, ${teleportPos.z.toFixed(2)})`);
            this.mesh.position.set(teleportPos.x, this.mesh.position.y, teleportPos.z);
            this.lastPosition.copy(this.mesh.position); // Update last position after teleport
        } else {
            console.error("Could not find any nearby floor tile to teleport to!");
            // Might happen if NPC gets completely walled in somehow
        }
    }
    // --- End Stuck Teleport ---


    attack(target, allNPCs) {
        console.log(`${this.constructor.name} attacks ${target.constructor.name}`);
        target.takeDamage(this.attackDamage, allNPCs);
    }

    takeDamage(amount, allNPCs) {
        this.health -= amount;
        console.log(`${this.isPlayer ? 'Player' : `Monster_${this.mesh.uuid.substring(0, 4)}`} took ${amount} damage, health: ${this.health}`);

        // Show damage text
        showDamageText(this.mesh.position, `-${amount}`); // Call the global function from game.js

        if (this.health <= 0) {
            this.health = 0;
            this.die();
            allNPCs.forEach(npc => {
                if (npc.target === this) {
                    npc.target = null;
                    console.log(`${npc.isPlayer ? 'Player' : `Monster_${npc.mesh.uuid.substring(0, 4)}`} target died, clearing target.`);
                }
            });
        }
    }

    die() {
        const npcId = this.isPlayer ? 'Player' : `Monster_${this.mesh.uuid.substring(0, 4)}`;
        console.log(`${npcId} died`);
        this.scene.remove(this.mesh);
        if (this.healthBarContainer && this.healthBarContainer.parentNode) {
            this.healthBarContainer.parentNode.removeChild(this.healthBarContainer);
        }
        this.target = null;
    }
}

class PlayerNPC extends BaseNPC {
    constructor(scene, map, mapWidth, mapHeight, textureOrColor) { // Accept texture/color
        super(scene, map, mapWidth, mapHeight, textureOrColor || 0x0000ff); // Pass to base, default blue
        this.isPlayer = true;
        this.maxHealth = 1000; // Set max health for player
        this.health = this.maxHealth; // Start at full health
        console.log("Player NPC initialized with increased health.");
    }

    update(allNPCs) {
        super.update(allNPCs);
    }
    // Player doesn't respawn, uses base die()
}

class MonsterNPC extends BaseNPC {
    constructor(scene, map, mapWidth, mapHeight, textureOrColor) { // Accept texture/color
        super(scene, map, mapWidth, mapHeight, textureOrColor || 0xff0000); // Pass to base, default red
        this.isPlayer = false;
        this.respawnDelay = 10000;
        this.respawnTimer = null;
        console.log("Monster NPC initialized.");
    }

    update(allNPCs) {
        super.update(allNPCs);
    }

    die() { // Override base die for respawn
        const npcId = `Monster_${this.mesh.uuid.substring(0, 4)}`;
        console.log(`${npcId} died. Scheduling respawn in ${this.respawnDelay / 1000}s.`);
        this.scene.remove(this.mesh);
        this.target = null;
        this.health = 0;

        if (this.respawnTimer) clearTimeout(this.respawnTimer);
        this.respawnTimer = setTimeout(() => this.respawn(), this.respawnDelay);
    }

    respawn() {
        const npcId = `Monster_${this.mesh.uuid.substring(0, 4)}`;
        console.log(`Respawning ${npcId}...`);
        let spawnPos = this.findValidSpawn();
        if (!spawnPos) {
            console.error(`Could not find valid respawn point for ${npcId}! Using fallback.`);
            spawnPos = { x: 0, z: 0 };
        }

        this.mesh.position.set(spawnPos.x, NPC_HEIGHT / 2, spawnPos.z);
        this.health = 100;
        this.target = null;
        this.lastAttackTime = 0;
        this.scene.add(this.mesh);
        this.respawnTimer = null;
        console.log(`${npcId} respawned at ${spawnPos.x.toFixed(2)}, ${spawnPos.z.toFixed(2)}`);
    }
}
