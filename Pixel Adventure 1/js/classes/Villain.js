class Villain extends Sprite {
    constructor({ position }) {
        super({
            position,
            imageSrc: 'Free/Main Characters/Pink Man/Idle (32x32).png', 
            frameRate: 11,
            scale: SCALE_BASE
        });
        this.velocity = { x: 0, y: 0 };
        this.speed = 2; 
        this.hitbox = { position: { x: 0, y: 0 }, width: 30, height: 40 };
        this.shootingTimer = 0;
        
        this.lives = 3;
        this.isHit = false; 
        this.invulnerable = false;
        this.markedForDeletion = false;
    }

    update(player) {
        this.draw(); 
        
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.velocity.y += GRAVITY;

        this.updateHitbox();
        this.checkForVerticalCollisions();
        
        if (this.isHit) return;

        const dx = player.position.x - this.position.x;
        if (Math.abs(dx) > 10) { 
            this.velocity.x = Math.sign(dx) * this.speed;
        } else {
            this.velocity.x = 0;
        }

        if (this.velocity.x !== 0) {
            if (this.image.src.includes('Idle')) {
                this.image.src = 'Free/Main Characters/Pink Man/Run (32x32).png'; 
                this.frameRate = 12; 
            }
        } else {
            if (this.image.src.includes('Run')) {
                this.image.src = 'Free/Main Characters/Pink Man/Idle (32x32).png';
                this.frameRate = 11;
            }
        }

        if (this.velocity.y === 0 && Math.random() < 0.01) { 
            this.velocity.y = -12;
        }

        this.shootingTimer++;
        if (this.shootingTimer > 120) { 
            this.shoot(player);
            this.shootingTimer = 0;
        }
    }

    takeDamage() {
        if (this.invulnerable) return;

        this.lives--;
        this.isHit = true;
        this.invulnerable = true;
        this.velocity.x = 0; 
        
        this.image.src = 'Free/Main Characters/Pink Man/Hit (32x32).png';
        this.frameRate = 7; 
        this.currentFrame = 0;
        
        playSound('boss_hit');

        if (this.lives <= 0) {
            setTimeout(() => {
                this.markedForDeletion = true; 
            }, 5000);
        } else {
            setTimeout(() => {
                this.isHit = false;
                this.invulnerable = false;
                this.image.src = 'Free/Main Characters/Pink Man/Idle (32x32).png';
                this.frameRate = 11;
            }, 1500);
        }
    }

    shoot(player) {
        const angle = Math.atan2(
            (player.position.y + 20) - (this.position.y + 20),
            (player.position.x + 16) - (this.position.x + 16)
        );
        const velocity = {
            x: Math.cos(angle) * 7,
            y: Math.sin(angle) * 7
        };
        projectiles.push(new Projectile({
            position: { x: this.position.x + 16, y: this.position.y + 20 },
            velocity: velocity
        }));
        playSound('shoot');
    }

    updateHitbox() {
        this.hitbox = {
            position: { x: this.position.x + 16, y: this.position.y + 22 },
            width: 30,
            height: 40
        };
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
            }
        }
    }
}