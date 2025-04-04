// NOTE: THREE, DungeonGenerator, TILE_SIZE, PlayerNPC, MonsterNPC are globally available

// Basic Scene Setup
const scene = new THREE.Scene(); // THREE is global
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20); // Position camera slightly above and back
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadows

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
// Configure shadow properties if needed
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);

// --- Dungeon Generation ---
const dungeonWidth = 50; // Grid cells
const dungeonHeight = 50; // Grid cells
// Note: DungeonGenerator constructor now takes minTunnelLength (defaulting to 2)
const dungeonGen = new DungeonGenerator(dungeonWidth, dungeonHeight, 75, 10); // width, height, maxTunnels, maxLength
const dungeonMap = dungeonGen.generate(); // This is the grid
dungeonGen.createGeometry(scene); // Add dungeon meshes to the scene

// --- TODO: Find valid spawn points from dungeonMap ---
// For now, place camera based on potential center
camera.position.set(0, TILE_SIZE * 10, TILE_SIZE * 5); // Adjust camera based on tile size
camera.lookAt(0, 0, 0);

// --- NPC Initialization ---
const npcs = [];
const player = new PlayerNPC(scene, dungeonMap, dungeonWidth, dungeonHeight);
npcs.push(player);

const numMonsters = 5;
for (let i = 0; i < numMonsters; i++) {
    const monster = new MonsterNPC(scene, dungeonMap, dungeonWidth, dungeonHeight);
    // console.log(`Created Monster ${i + 1} at:`, monster.mesh.position); // Keep minimal logs
    npcs.push(monster);
}
console.log("Total NPCs created:", npcs.length);

// Game Loop
let frameCount = 0;
function animate() {
    requestAnimationFrame(animate);

    // --- Game Logic Updates ---
    // Optional: Less frequent logging
    // if (frameCount % 120 === 0) {
    //     console.log(`--- Frame ${frameCount} ---`);
    //     console.log(`Player Position: ${player.mesh.position.x.toFixed(2)}, ${player.mesh.position.z.toFixed(2)} | Target: ${player.target ? player.target.constructor.name : 'None'} | Health: ${player.health}`);
    //     npcs.forEach((npc, index) => {
    //         if (index > 0 && npc.health > 0) { // Log monsters only
    //              console.log(`Monster ${index} Position: ${npc.mesh.position.x.toFixed(2)}, ${npc.mesh.position.z.toFixed(2)} | Target: ${npc.target ? npc.target.constructor.name : 'None'} | Health: ${npc.health}`);
    //         }
    //     });
    // }
    // frameCount++;

    // Update all NPCs and their health bars
    npcs.forEach(npc => {
        if (npc.health > 0) {
             npc.update(npcs);

             // Update Health Bar Position
             const screenPos = worldToScreen(npc.mesh.position, camera);
             if (screenPos) {
                 npc.healthBarContainer.style.display = 'block';
                 // Position slightly above the sprite center
                 npc.healthBarContainer.style.left = `${screenPos.x}px`;
                 npc.healthBarContainer.style.top = `${screenPos.y - 20}px`; // Adjust offset as needed
                 // Update fill percentage
                 const healthPercent = (npc.health / npc.maxHealth) * 100;
                 npc.healthBarFill.style.width = `${healthPercent}%`;
             } else {
                 npc.healthBarContainer.style.display = 'none'; // Hide if off-screen
             }

        } else {
             // Hide health bar if dead
             if (npc.healthBarContainer) {
                 npc.healthBarContainer.style.display = 'none';
             }
        }
    });

    // Basic Camera follow player NPC
    if (player.health > 0) {
        const cameraOffset = new THREE.Vector3(0, TILE_SIZE * 8, TILE_SIZE * 6); // Adjust offset as needed
        const targetPosition = player.mesh.position.clone().add(cameraOffset);
        camera.position.lerp(targetPosition, 0.05); // Smooth camera movement (lerp)
        camera.lookAt(player.mesh.position);
    } else {
        // Optional: If player dies, maybe stop following or switch view
    }


    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// Start the game loop
animate();

// Helper function to convert 3D world position to 2D screen coordinates
function worldToScreen(worldPosition, camera) {
    const vector = worldPosition.clone().project(camera);
    if (vector.z > 1) { // Behind camera
        return null;
    }
    const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
    const y = (vector.y * -0.5 + 0.5) * renderer.domElement.clientHeight;
    return { x, y };
}

console.log("3D ARPG Scene Initialized");
