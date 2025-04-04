// NOTE: THREE is now globally available via the script tag in index.html

const TILE_SIZE = 2; // Size of each dungeon tile/block (now global)
const PATH_WIDTH = 1; // Radius around center path to carve (0=1 tile, 1=3 tiles, 2=5 tiles)

class DungeonGenerator { // Removed 'export'
    constructor(width, height, maxTunnels, maxLength, minTunnelLength = 2) { // Added minTunnelLength
        this.width = width; // Grid width
        this.height = height; // Grid height
        this.maxTunnels = maxTunnels; // Max number of tunnels
        this.maxLength = Math.max(1, maxLength); // Ensure max is at least 1
        this.minTunnelLength = Math.max(1, minTunnelLength); // Ensure min is at least 1
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

            // Ensure length is within min/max bounds
            let randomLength = this.minTunnelLength + Math.floor(Math.random() * (this.maxLength - this.minTunnelLength + 1));
            let tunnelLength = 0;

            while (tunnelLength < randomLength) {
                 // Check bounds for the *center* of the path + path width buffer
                 const nextRow = currentRow + randomDirection[0];
                 const nextCol = currentColumn + randomDirection[1];

                 if (nextRow <= PATH_WIDTH || nextRow >= this.height - 1 - PATH_WIDTH ||
                     nextCol <= PATH_WIDTH || nextCol >= this.width - 1 - PATH_WIDTH) {
                     // console.log("Stopping tunnel near edge"); // Optional log
                     break; // Stop if getting too close to the edge to carve full width
                 }

                 // Carve out wider path
                 for (let r = -PATH_WIDTH; r <= PATH_WIDTH; r++) {
                     for (let c = -PATH_WIDTH; c <= PATH_WIDTH; c++) {
                         if (this.map[currentRow + r] && this.map[currentRow + r][currentColumn + c] !== undefined) {
                              this.map[currentRow + r][currentColumn + c] = 0; // 0 = Floor
                         }
                     }
                 }

                 // Move the center
                 currentRow = nextRow;
                 currentColumn = nextCol;
                 tunnelLength++;
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

// No export needed for TILE_SIZE, it's now global in this context
