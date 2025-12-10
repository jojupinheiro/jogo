class CollisionBlock {
    constructor({ position, type = 1 }) {
        this.position = position;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.image = new Image();
        this.image.src = 'Free/Terrain/Terrain (16x16).png';
        this.type = type;
        
        this.crops = {
            1: { x: 96, y: 0 },  
            4: { x: 64, y: 16 }, 
            5: { x: 80, y: 16 }, 
            6: { x: 96, y: 16 }, 
            7: { x: 64, y: 0 },  
            8: { x: 112, y: 0 }, 
            9: { x: 80, y: 0 }, 
        };
    }

    draw() {
        const crop = this.crops[this.type] || this.crops[1];
        ctx.drawImage(
            this.image, 
            crop.x, crop.y, 16, 16, 
            this.position.x, this.position.y, 
            this.width, this.height
        );
    }
}