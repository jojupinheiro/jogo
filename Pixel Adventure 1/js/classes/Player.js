class Player extends Sprite {
    constructor() {
        super({
            position: { x: 100, y: 300 },
            imageSrc: 'Free/Main Characters/Mask Dude/Idle (32x32).png',
            frameRate: 11,
            scale: SCALE_BASE
        });

        this.velocity = { x: 0, y: 0 };
        this.speed = 5; 
        this.jumpStrength = -15;
        this.hitbox = { position: { x: 0, y: 0 }, width: 0, height: 0 };
        this.knockbackTimer = 0;
    }

    update() {
        this.draw();
        
        if (this.knockbackTimer > 0) {
            this.knockbackTimer--;
            this.velocity.x *= 0.9;
        } 
        
        this.position.x += this.velocity.x;
        this.updateHitbox();
        this.checkForHorizontalCollisions();

        this.velocity.y += GRAVITY;
        this.position.y += this.velocity.y;
        this.updateHitbox();
        this.checkForVerticalCollisions();
    }

    updateHitbox() {
        this.hitbox = {
            position: { x: this.position.x + 16, y: this.position.y + 22 },
            width: 30,
            height: 40
        };
    }

    checkForHorizontalCollisions() {
        for (let i = 0; i < collisionBlocks.length; i++) {
            const block = collisionBlocks[i];
            if (checkOverlap(this.hitbox, block)) {
                if (this.velocity.x > 0) {
                    const offset = this.hitbox.position.x - this.position.x + this.hitbox.width;
                    this.position.x = block.position.x - offset - 0.1;
                }
                if (this.velocity.x < 0) {
                    const offset = this.hitbox.position.x - this.position.x;
                    this.position.x = block.position.x + block.width - offset + 0.1;
                }
            }
        }
    }

    checkForVerticalCollisions() {
        for (let i = 0; i < collisionBlocks.length; i++) {
            const block = collisionBlocks[i];
            if (checkOverlap(this.hitbox, block)) {
                if (this.velocity.y > 0) {
                    this.velocity.y = 0;
                    const offset = this.hitbox.position.y - this.position.y + this.hitbox.height;
                    this.position.y = block.position.y - offset - 0.1;
                }
                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                    const offset = this.hitbox.position.y - this.position.y;
                    this.position.y = block.position.y + block.height - offset + 0.1;
                }
            }
        }
    }

    jump() {
        if (this.velocity.y === 0 && this.knockbackTimer === 0) {
            this.velocity.y = this.jumpStrength;
            playSound('jump');
        }
    }
    
    applyKnockback(directionX) {
        this.velocity.y = -12;
        this.velocity.x = directionX * 10; 
        this.knockbackTimer = 30; 
        playSound('jump');
    }
    
    bounce() { 
        this.velocity.y = this.jumpStrength * 0.8;
        playSound('jump');
    }
}