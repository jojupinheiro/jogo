class Fruit extends Sprite {
    constructor({ position }) {
        const randomFruit = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
        super({
            position,
            imageSrc: `Free/Items/Fruits/${randomFruit}.png`,
            frameRate: 17,
            frameBuffer: 4,
            scale: SCALE_BASE
        });
        this.hitbox = { position: { x: position.x + 10, y: position.y + 10 }, width: 12, height: 12 };
    }
    update() {
        this.draw();
        this.hitbox.position.x = this.position.x + 10;
        this.hitbox.position.y = this.position.y + 10;
    }
}

class Spike extends Sprite {
    constructor({ position }) {
        super({
            position,
            imageSrc: 'Free/Traps/Spikes/Idle.png',
            frameRate: 1,
            scale: SCALE_BASE
        });
        this.hitbox = { 
            position: { x: this.position.x + 2, y: this.position.y + (TILE_SIZE/2) }, 
            width: TILE_SIZE - 4, 
            height: TILE_SIZE / 2 
        }
    }
    update() {
        this.draw();
    }
}