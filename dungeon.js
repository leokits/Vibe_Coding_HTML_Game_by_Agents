import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

const TILE_SIZE = 2; // Size of each dungeon tile/block

export class DungeonGenerator {
    constructor(width, height, maxTunnels, maxLength) {
        this.width = width; // Grid width
        this.height = height; // Grid height
        this.maxTunnels = maxTunnels; // Max number of tunnels
        this.maxLength = maxLength; // Max length of each tunnel
        this.map = this.createMap(); // Initialize the grid
    }

    // Initialize grid with all walls (1)
    createMap() {
        let map = [];
        for (let y = 0; y < this.height; y++) {
            map[y] = [];
            for (let x = 0; x < this.width; x++) {
                map[y][x] = 1; // 1 = Wall
            }
        }
        return map;
    }

    // Generate the dungeon layout using random walk
    generate() {
        let currentRow = Math.floor(Math.random() * this.height);
        let currentColumn = Math.floor(Math.random() * this.width);
        let directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Up, Down, Left, Right
        let lastDirection = [];
        let randomDirection;

        while (this.maxTunnels > 0 && this.maxLength > 0) {
            // Select a random direction, favoring the previous one to make straighter tunnels
            do {
                randomDirection = directions[Math.floor(Math.random() * directions.length)];
            } while (
                (randomDirection[0] === -lastDirection[0] && randomDirection[1] === -lastDirection[1]) || // Don't go back immediately
                (randomDirection[0] === lastDirection[0] && randomDirection[1] === lastDirection[1] && Math.random() < 0.8) // 80% chance to continue same direction
            );

            let randomLength = Math.ceil(Math.random() * this.maxLength);
            let tunnelLength = 0;

            while (tunnelLength < randomLength) {
                // Check bounds
                if (((currentRow === 0) && (randomDirection[0] === -1)) ||
                    ((currentColumn === 0) && (randomDirection[1] === -1)) ||
                    ((currentRow === this.height - 1) && (randomDirection[0] === 1)) ||
                    ((currentColumn === this.width - 1) && (randomDirection[1] === 1))) {
                    break; // Stop if hitting the edge
                } else {
                    this.map[currentRow][currentColumn] = 0; // 0 = Floor
                    currentRow += randomDirection[0];
                    currentColumn += randomDirection[1];
                    tunnelLength++;
                }
            }

            if (tunnelLength > 0) { // If we made a tunnel segment
                lastDirection = randomDirection;
                this.maxTunnels--;
            }
        }
        console.log("Dungeon map generated:", this.map);
        return this.map;
    }

    // Create 3D geometry from the map
    createGeometry(scene) {
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa }); // Grey floor
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 }); // Dark grey walls
        const blockGeometry = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE);

        const dungeonGroup = new THREE.Group(); // Group all dungeon blocks

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const xPos = (x - this.width / 2) * TILE_SIZE;
                const zPos = (y - this.height / 2) * TILE_SIZE;

                if (this.map[y][x] === 0) { // Floor
                    const floorBlock = new THREE.Mesh(blockGeometry, floorMaterial);
                    floorBlock.position.set(xPos, -TILE_SIZE / 2, zPos); // Position floor slightly below origin y=0
                    floorBlock.receiveShadow = true;
                    dungeonGroup.add(floorBlock);
                } else { // Wall (optional: add wall blocks for visual representation)
                    // For simplicity, we'll just have floors for now.
                    // Walls could be added here, potentially taller than floor blocks.
                    // const wallBlock = new THREE.Mesh(blockGeometry, wallMaterial);
                    // wallBlock.position.set(xPos, TILE_SIZE / 2, zPos); // Position wall centered at y=0
                    // wallBlock.castShadow = true;
                    // wallBlock.receiveShadow = true;
                    // dungeonGroup.add(wallBlock);
                }
            }
        }
        scene.add(dungeonGroup);
        console.log("Dungeon geometry created.");
    }
}

export { TILE_SIZE };
