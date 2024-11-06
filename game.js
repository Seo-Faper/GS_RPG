class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.level = 1;
        this.state = 'INIT'; // 게임 상태 초기화
        this.map = null;
        this.player = null;
        this.monsters = [];
        this.items = [];
        this.setup();
    }

    setup() {
        window.addEventListener('keydown', (e) => this.handleInput(e));
        this.changeLevel(this.level); // 초기 레벨 세팅
        this.gameLoop(); // 게임 루프 시작
    }

    // 레벨 전환 메서드
    changeLevel(level) {
        this.level = level;
        console.log(`Starting Level: ${this.level}`);

        // 모든 객체를 새로 생성하여 초기화
        this.map = new Map();
        this.map.generate(); // 맵 생성

        this.player = new Player(this.map);
        this.player.spawn(); // 플레이어 생성 및 스폰

        this.monsters = [];
        this.items = [];
        for (let i = 0; i < 5; i++) {
            const monster = new Monster(this.map);
            this.monsters.push(monster);
        }
        for (let i = 0; i < 5; i++) {
            const item = new Item(this.map);
            this.items.push(item);
        }

        this.updateStatus();
        this.state = 'RUNNING'; // 게임 상태 전환
    }

    // 키 입력 핸들링
    handleInput(event) {
        if (this.state !== 'RUNNING') return;

        switch (event.key) {
            case 'ArrowUp': this.player.move(0, -1); break;
            case 'ArrowDown': this.player.move(0, 1); break;
            case 'ArrowLeft': this.player.move(-1, 0); break;
            case 'ArrowRight': this.player.move(1, 0); break;
        }

        this.checkStaircase();
        this.checkItems();
    }

    // 플레이어가 계단에 도달했을 때 레벨 변경
    checkStaircase() {
        if (this.map.grid[this.player.position.x][this.player.position.y] === 4) {
            this.state = 'TRANSITION';
            setTimeout(() => {
                this.changeLevel(this.level + 1);
            }, 100); // 레벨 전환 시 약간의 지연
        }
    }

    checkItems() {
        this.items = this.items.filter(item => {
            if (item.position.x === this.player.position.x && item.position.y === this.player.position.y) {
                this.player.inventory.push(item);
                return false;
            }
            return true;
        });
    }

    updateStatus() {
        document.getElementById('level').textContent = `Level: ${this.level}`;
        document.getElementById('inventory').textContent = `Inventory: ${this.player.inventory.length} items`;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.map.render(this.ctx);
        this.player.render(this.ctx);
        this.monsters.forEach(monster => monster.render(this.ctx));
        this.items.forEach(item => item.render(this.ctx));
    }

    // 메인 게임 루프
    gameLoop() {
        if (this.state === 'RUNNING') {
            this.updateStatus();
            this.render();
        }
        requestAnimationFrame(() => this.gameLoop());
    }
}
class Map {
    constructor() {
        this.size = 64;
        this.grid = [];
        this.rooms = [];
    }

    generate() {
        for (let x = 0; x < this.size; x++) {
            this.grid[x] = [];
            for (let y = 0; y < this.size; y++) {
                this.grid[x][y] = 0;
            }
        }

        const roomCount = Helpers.getRandom(20, 25);
        const minSize = 5;
        const maxSize = 10;

        for (let i = 0; i < roomCount; i++) {
            const room = {
                x: Helpers.getRandom(1, this.size - maxSize - 1),
                y: Helpers.getRandom(1, this.size - maxSize - 1),
                w: Helpers.getRandom(minSize, maxSize),
                h: Helpers.getRandom(minSize, maxSize)
            };

            if (this.doesCollide(room)) {
                i--;
                continue;
            }
            room.w--;
            room.h--;

            this.rooms.push(room);
        }

        this.squashRooms();

        for (let i = 0; i < roomCount; i++) {
            const roomA = this.rooms[i];
            const roomB = this.findClosestRoom(roomA);

            let pointA = {
                x: Helpers.getRandom(roomA.x, roomA.x + roomA.w),
                y: Helpers.getRandom(roomA.y, roomA.y + roomA.h)
            };
            let pointB = {
                x: Helpers.getRandom(roomB.x, roomB.x + roomB.w),
                y: Helpers.getRandom(roomB.y, roomB.y + roomB.h)
            };

            while ((pointB.x !== pointA.x) || (pointB.y !== pointA.y)) {
                if (pointB.x !== pointA.x) {
                    pointB.x += pointB.x > pointA.x ? -1 : 1;
                } else if (pointB.y !== pointA.y) {
                    pointB.y += pointB.y > pointA.y ? -1 : 1;
                }

                this.grid[pointB.x][pointB.y] = 1;
            }
        }

        for (let i = 0; i < roomCount; i++) {
            const room = this.rooms[i];
            for (let x = room.x; x < room.x + room.w; x++) {
                for (let y = room.y; y < room.y + room.h; y++) {
                    this.grid[x][y] = 1;
                }
            }
        }

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (this.grid[x][y] === 1) {
                    for (let xx = x - 1; xx <= x + 1; xx++) {
                        for (let yy = y - 1; yy <= y + 1; yy++) {
                            if (this.grid[xx][yy] === 0) this.grid[xx][yy] = 2;
                        }
                    }
                }
            }
        }

        let stairPlaced = false;
        while (!stairPlaced) {
            const stairX = Math.floor(Math.random() * this.size);
            const stairY = Math.floor(Math.random() * this.size);
            if (this.grid[stairX][stairY] === 1) {
                this.grid[stairX][stairY] = 4;
                stairPlaced = true;
            }
        }
    }

    findClosestRoom(room) {
        const mid = {
            x: room.x + (room.w / 2),
            y: room.y + (room.h / 2)
        };
        let closest = null;
        let closestDistance = 1000;
        for (let i = 0; i < this.rooms.length; i++) {
            const check = this.rooms[i];
            if (check === room) continue;
            const checkMid = {
                x: check.x + (check.w / 2),
                y: check.y + (check.h / 2)
            };
            const distance = Math.min(
                Math.abs(mid.x - checkMid.x) - (room.w / 2) - (check.w / 2),
                Math.abs(mid.y - checkMid.y) - (room.h / 2) - (check.h / 2)
            );
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = check;
            }
        }
        return closest;
    }

    squashRooms() {
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < this.rooms.length; j++) {
                const room = this.rooms[j];
                while (true) {
                    const oldPosition = { x: room.x, y: room.y };
                    if (room.x > 1) room.x--;
                    if (room.y > 1) room.y--;
                    if ((room.x === 1) && (room.y === 1)) break;
                    if (this.doesCollide(room, j)) {
                        room.x = oldPosition.x;
                        room.y = oldPosition.y;
                        break;
                    }
                }
            }
        }
    }

    doesCollide(room, ignore) {
        for (let i = 0; i < this.rooms.length; i++) {
            if (i === ignore) continue;
            const check = this.rooms[i];
            if (!((room.x + room.w < check.x) || (room.x > check.x + check.w) || (room.y + room.h < check.y) || (room.y > check.y + check.h))) return true;
        }
        return false;
    }

    render(ctx) {
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (this.grid[x][y] === 1) {
                    ctx.fillStyle = '#C6FFDD'; // Floor
                } else if (this.grid[x][y] === 4) {
                    ctx.fillStyle = '#00FF00'; // Staircase
                } else if (this.grid[x][y] === 2) {
                    ctx.fillStyle = '#0F2027'; // Wall
                }
                ctx.fillRect(x * 10, y * 10, 10, 10);
            }
        }
    }
}

class Player {
    constructor(map) {
        this.map = map;
        this.position = { x: 0, y: 0 };
        this.inventory = [];
    }

    spawn() {
        do {
            this.position.x = Math.floor(Math.random() * this.map.size);
            this.position.y = Math.floor(Math.random() * this.map.size);
        } while (this.map.grid[this.position.x][this.position.y] !== 1);
    }

    move(dx, dy) {
        const newX = this.position.x + dx;
        const newY = this.position.y + dy;
        if (newX >= 0 && newX < this.map.size && newY >= 0 && newY < this.map.size) {
            if (this.map.grid[newX][newY] !== 2) {
                this.position.x = newX;
                this.position.y = newY;
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = '#f4791f'; // Player color
        ctx.fillRect(this.position.x * 10, this.position.y * 10, 10, 10);
    }
}

class Monster {
    constructor(map) {
        this.map = map;
        this.position = { x: 0, y: 0 };
        this.spawn();
    }

    spawn() {
        do {
            this.position.x = Math.floor(Math.random() * this.map.size);
            this.position.y = Math.floor(Math.random() * this.map.size);
        } while (this.map.grid[this.position.x][this.position.y] !== 1);
    }

    render(ctx) {
        ctx.fillStyle = '#FF0000'; // Monster color
        ctx.fillRect(this.position.x * 10, this.position.y * 10, 10, 10);
    }
}

class Item {
    constructor(map) {
        this.map = map;
        this.position = { x: 0, y: 0 };
        this.spawn();
    }

    spawn() {
        do {
            this.position.x = Math.floor(Math.random() * this.map.size);
            this.position.y = Math.floor(Math.random() * this.map.size);
        } while (this.map.grid[this.position.x][this.position.y] !== 1);
    }

    render(ctx) {
        ctx.fillStyle = '#FFFF00'; // Item color
        ctx.fillRect(this.position.x * 10, this.position.y * 10, 10, 10);
    }
}

class Helpers {
    static getRandom(low, high) {
        return Math.floor(Math.random() * (high - low)) + low;
    }
}

window.onload = () => {
    const game = new Game();
};