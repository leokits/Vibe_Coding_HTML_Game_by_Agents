import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { DungeonGenerator, TILE_SIZE } from './dungeon.js';
import { PlayerNPC, MonsterNPC } from './npc.js';

// Basic Scene Setup
const scene = new THREE.Scene();
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
const dungeonGen = new DungeonGenerator(dungeonWidth, dungeonHeight, 75, 10); // width, height, maxTunnels, maxLength
const dungeonMap = dungeonGen.generate();
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
    npcs.push(monster);
}


// Game Loop
function animate() {
    requestAnimationFrame(animate);

    // --- Game Logic Updates ---

    // Update all NPCs
    npcs.forEach(npc => {
        if (npc.health > 0) { // Only update living NPCs
             npc.update(npcs); // Pass the list of all NPCs for targeting
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

console.log("3D ARPG Scene Initialized");

// --- TODO ---
// 1. Dungeon Generation Logic
// 2. NPC Class/Logic (Player NPC, Monster NPCs)
// 3. Movement and Pathfinding
// 4. Combat System
// 5. Asset Loading (Models, Textures)
