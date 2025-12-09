const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- CONFIGURAÇÕES GLOBAIS ---
const GRAVITY = 0.6;
const SCALE_BASE = 2; 
const TILE_SIZE = 16 * SCALE_BASE; // 32px

// Variáveis de Estado
let isMuted = false;
let gameRunning = true;

// Carregar Imagens
const bgImage = new Image();
bgImage.src = 'Free/Background/Blue.png';

const volumeImg = new Image();
volumeImg.src = 'Free/Menu/Buttons/Volume.png';

const fruitTypes = [
    'Apple', 'Bananas', 'Cherries', 'Kiwi', 'Melon', 'Orange', 'Pineapple', 'Strawberry'
];

// --- SISTEMA DE SOM ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (isMuted || audioCtx.state === 'suspended') {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if (isMuted) return;
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'collect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'hurt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.2);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'boss_hit') { 
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'gameover' || type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(type === 'win' ? 400 : 100, now);
        osc.frequency.linearRampToValueAtTime(type === 'win' ? 800 : 20, now + 1.0);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
        osc.start(now);
        osc.stop(now + 1.0);
    }
}

// --- CLASSES VISUAIS ---

class Sprite {
    constructor({ position, imageSrc, frameRate = 1, frameBuffer = 3, scale = 1 }) {
        this.position = position;
        this.image = new Image();
        this.image.src = imageSrc;
        this.scale = scale;
        this.frameRate = frameRate;
        this.currentFrame = 0;
        this.elapsedFrames = 0;
        this.frameBuffer = frameBuffer;
        this.loaded = false;
        this.image.onload = () => { this.loaded = true; };
    }

    draw() {
        if (!this.loaded) return;
        const cropbox = {
            position: { x: this.currentFrame * (this.image.width / this.frameRate), y: 0 },
            width: this.image.width / this.frameRate,
            height: this.image.height
        };
        ctx.drawImage(
            this.image,
            cropbox.position.x, cropbox.position.y,
            cropbox.width, cropbox.height,
            this.position.x, this.position.y,
            cropbox.width * this.scale, cropbox.height * this.scale
        );
        this.updateFrames();
    }

    updateFrames() {
        this.elapsedFrames++;
        if (this.elapsedFrames % this.frameBuffer === 0) {
            if (this.currentFrame < this.frameRate - 1) this.currentFrame++;
            else this.currentFrame = 0;
        }
    }
}

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

class Projectile {
    constructor({ position, velocity }) {
        this.position = position;
        this.velocity = velocity;
        this.radius = 6;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

// --- VILÃO ATUALIZADO ---
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
        this.markedForDeletion = false; // Nova flag para saber quando remover do jogo
    }

    update(player) {
        this.draw(); // Sempre desenha (para mostrar a animação de Hit)
        
        // Física
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.velocity.y += GRAVITY;

        this.updateHitbox();
        this.checkForVerticalCollisions();
        
        // Se estiver "machucado" ou "morrendo", para a lógica de movimento
        if (this.isHit) return;

        // IA: Persegue
        const dx = player.position.x - this.position.x;
        if (Math.abs(dx) > 10) { 
            this.velocity.x = Math.sign(dx) * this.speed;
        } else {
            this.velocity.x = 0;
        }

        // Animação
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
        this.velocity.x = 0; // Para de mover
        
        // Toca animação de HIT
        this.image.src = 'Free/Main Characters/Pink Man/Hit (32x32).png';
        this.frameRate = 7; 
        this.currentFrame = 0;
        
        playSound('boss_hit');

        if (this.lives <= 0) {
            // MORTE: Fica no loop de animação por 5 segundos
            setTimeout(() => {
                this.markedForDeletion = true; // Avisa o GameManager para remover
            }, 5000);
        } else {
            // RECUPERAÇÃO: Volta ao normal em 1.5s
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

// --- PLAYER ---
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
}

function checkOverlap(rect1, rect2) {
    return (
        rect1.position.x <= rect2.position.x + rect2.width &&
        rect1.position.x + rect1.width >= rect2.position.x &&
        rect1.position.y + rect1.height >= rect2.position.y &&
        rect1.position.y <= rect2.position.y + rect2.height
    );
}

// --- GERENCIADOR DO JOGO ---
class GameManager {
    constructor() {
        this.currentLevel = 0;
        this.startTime = Date.now();
        this.lives = 3;
        this.levels = [];
        this.setupLevels();
        this.isGameOver = false;
        this.gameWon = false;
        this.villain = null;
    }

    setupLevels() {
        // --- FASE 1 ---
        const level1 = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [7,1,1,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [4,5,5,5,6,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,7,1,1,1,1,8,0,0,0,0,0,0,0,0,0,7,1,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,7,1,1,1,8,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,5,6,0,0,0,0,0,0,0,0,0,4,5,5,5,6,0,0,0,0,0,0,0,0],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
            [5,0,2,0,0,0,0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
            [5,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,5],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,8,0,0,0,7,1,1,1,1,1,1,8,0,0,0,0,7,1,1,1,1,1],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,7,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0],
            [1,1,1,1,1,1,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,7,1,8,0,0,0,7,1,1,1,1,1,1,1,1,1],
            [5,5,5,5,5,5,0,0,0,5,5,5,5,0,0,0,0,0,3,0,0,0,0,0,4,5,6,0,0,0,4,5,5,5,5,5,5,5,5,5],
            [5,5,5,5,5,5,1,1,1,5,5,5,5,1,1,1,1,1,1,1,1,1,1,1,5,5,5,1,1,1,5,5,5,5,5,5,5,5,5,5],
            [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]
        ];

        // --- FASE 2 ---
        const level2 = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0],
            [0,0,0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,8,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
            [0,0,7,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,1,1,1,1,1,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [7,1,1,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [4,5,5,5,6,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,0,0,0,0,0,0],
            [4,5,5,5,6,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [4,5,5,5,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]
        ];

        // --- FASE 3 ---
        const level3 = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,7,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,1,1,8,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,2,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,1,1,1,1,1,1,8,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0],
            [5,5,5,0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,5,5,5,5,5,5,0,0,0,0],
            [5,5,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,5,5,5,5,5,1,1,1,1],
            [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]
        ];

        // --- FASE 4 ---
        const level4 = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,8,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,1,1,1,1,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,0,0,0,7,1,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,1,8,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
            [5,5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,5],
            [5,5,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,5,5],
            [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]
        ];
        
        this.levels.push(level1); 
        this.levels.push(level2); 
        this.levels.push(level3); 
        this.levels.push(level4); 
    }

    loadCurrentLevel() {
        if (this.currentLevel >= this.levels.length) {
            this.gameWon = true;
            this.finishGame();
            return;
        }

        const map = this.levels[this.currentLevel];
        collisionBlocks = [];
        fruits = [];
        traps = [];
        projectiles = []; 
        this.villain = null;

        map.forEach((row, y) => {
            row.forEach((symbol, x) => {
                const position = { x: x * TILE_SIZE, y: y * TILE_SIZE };
                if (symbol === 2) fruits.push(new Fruit({ position }));
                else if (symbol === 3) traps.push(new Spike({ position }));
                else if (symbol !== 0) collisionBlocks.push(new CollisionBlock({ position, type: symbol }));
            });
        });

        if (this.currentLevel === 3) {
            this.villain = new Villain({ position: { x: 28 * TILE_SIZE, y: 300 } });
        }

        player.position = { x: 100, y: 300 };
        player.velocity = { x: 0, y: 0 };
    }

    handlePlayerDeath() {
        this.lives--;
        playSound('hurt');
        if (this.lives > 0) {
            player.position = { x: 100, y: 300 };
            player.velocity = { x: 0, y: 0 };
            projectiles = []; 
        } else {
            playSound('gameover');
            this.gameWon = false;
            this.finishGame();
        }
    }

    checkWinCondition() {
        if (!this.villain && fruits.length === 0) {
            this.nextLevel();
        }
    }

    checkBossWinCondition() {
        // Agora verificamos a flag marcada pelo Villain quando a animação de morte acaba
        if (this.currentLevel === 3 && this.villain === null) {
            this.nextLevel();
        }
    }

    nextLevel() {
        this.currentLevel++;
        playSound('collect'); 
        if (this.currentLevel < this.levels.length) {
            setTimeout(() => {
                this.loadCurrentLevel();
            }, 500);
        } else {
            this.gameWon = true;
            this.finishGame();
        }
    }

    finishGame() {
        this.isGameOver = true;
        
        if (this.gameWon) {
            playSound('win');
            const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
            
            setTimeout(() => {
                const playerName = prompt("Parabéns! Você venceu! Digite seu nome para o ranking:", "Jogador");
                if (playerName) {
                    this.saveRanking(playerName, totalTime);
                }
            }, 100);
        }
    }

    saveRanking(name, time) {
        let ranking = JSON.parse(localStorage.getItem('pixelAdventureRankingName')) || [];
        ranking.push({ name: name, time: parseFloat(time) });
        ranking.sort((a, b) => a.time - b.time);
        ranking = ranking.slice(0, 5);
        localStorage.setItem('pixelAdventureRankingName', JSON.stringify(ranking));
    }

    drawHearts() {
        const heartSize = 25;
        const startX = 20;
        const startY = 60; 

        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const x = startX + (i * 35);
            const y = startY;
            
            ctx.save();
            if (i < this.lives) {
                ctx.fillStyle = 'red';
            } else {
                ctx.fillStyle = 'gray'; 
            }
            
            ctx.beginPath();
            ctx.moveTo(x, y + heartSize / 4);
            ctx.quadraticCurveTo(x, y, x + heartSize / 4, y);
            ctx.quadraticCurveTo(x + heartSize / 2, y, x + heartSize / 2, y + heartSize / 4);
            ctx.quadraticCurveTo(x + heartSize / 2, y, x + heartSize * 3/4, y);
            ctx.quadraticCurveTo(x + heartSize, y, x + heartSize, y + heartSize / 4);
            ctx.quadraticCurveTo(x + heartSize, y + heartSize / 2, x + heartSize / 2, y + heartSize * 0.9);
            ctx.quadraticCurveTo(x, y + heartSize / 2, x, y + heartSize / 4);
            ctx.fill();
            ctx.restore();
        }
    }

    drawUI() {
        const volX = canvas.width - 50;
        const volY = 20;
        if (volumeImg.complete) {
            ctx.drawImage(volumeImg, volX, volY, 32, 32);
            if (isMuted) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(volX, volY);
                ctx.lineTo(volX + 32, volY + 32);
                ctx.stroke();
            }
        }

        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Arial';
        
        if (!this.isGameOver) {
            const time = ((Date.now() - this.startTime) / 1000).toFixed(1);
            ctx.fillText(`Fase: ${this.currentLevel + 1}/4`, 20, 40);
            
            if (this.villain) {
                ctx.fillStyle = 'purple';
                ctx.fillText(`BOSS HP: ${Math.max(0, this.villain.lives)}/3`, 150, 40);
                ctx.fillStyle = 'black';
            } else {
                ctx.fillText(`Frutas: ${fruits.length}`, 150, 40);
            }
            
            ctx.fillText(`Tempo: ${time}s`, 300, 40);
            this.drawHearts();

        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            
            if (this.gameWon) {
                ctx.fillText('JOGO ZERADO!', canvas.width / 2, 100);
                ctx.font = '25px Arial';
                ctx.fillText('Ranking:', canvas.width / 2, 160);
                
                const ranking = JSON.parse(localStorage.getItem('pixelAdventureRankingName')) || [];
                ranking.forEach((entry, index) => {
                    ctx.fillText(`${index + 1}. ${entry.name} - ${entry.time}s`, canvas.width / 2, 200 + (index * 35));
                });
            } else {
                ctx.fillStyle = '#ff4444';
                ctx.fillText('GAME OVER', canvas.width / 2, 150);
                ctx.fillStyle = 'white';
                ctx.font = '25px Arial';
                ctx.fillText('Tente novamente...', canvas.width / 2, 200);
            }
            
            ctx.font = '20px Arial';
            ctx.fillText('Pressione F5 para reiniciar', canvas.width / 2, 450);
            ctx.textAlign = 'left'; 
        }
    }
}

const player = new Player();
const gameManager = new GameManager();
let collisionBlocks = [];
let fruits = [];
let traps = [];
let projectiles = [];

gameManager.loadCurrentLevel();

// --- CONTROLES MOUSE (Mute) ---
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const volX = canvas.width - 50;
    const volY = 20;
    if (x >= volX && x <= volX + 32 && y >= volY && y <= volY + 32) {
        isMuted = !isMuted;
    }
});

// --- CONTROLES TECLADO ---
const keys = { right: { pressed: false }, left: { pressed: false } };

window.addEventListener('keydown', (event) => {
    if (gameManager.isGameOver) return;
    switch (event.key) {
        case 'd': case 'ArrowRight':
            keys.right.pressed = true;
            if (player.knockbackTimer === 0 && player.image.src.includes('Idle')) {
                player.image.src = 'Free/Main Characters/Mask Dude/Run (32x32).png';
                player.frameRate = 12;
            }
            break;
        case 'a': case 'ArrowLeft':
            keys.left.pressed = true;
             if (player.knockbackTimer === 0 && player.image.src.includes('Idle')) {
                player.image.src = 'Free/Main Characters/Mask Dude/Run (32x32).png';
                player.frameRate = 12;
            }
            break;
        case 'w': case 'ArrowUp': case ' ': player.jump(); break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd': case 'ArrowRight':
            keys.right.pressed = false;
            if (player.knockbackTimer === 0) {
                player.image.src = 'Free/Main Characters/Mask Dude/Idle (32x32).png';
                player.frameRate = 11;
            }
            break;
        case 'a': case 'ArrowLeft':
            keys.left.pressed = false;
            if (player.knockbackTimer === 0) {
                player.image.src = 'Free/Main Characters/Mask Dude/Idle (32x32).png';
                player.frameRate = 11;
            }
            break;
    }
});

function animate() {
    window.requestAnimationFrame(animate);
    
    if (bgImage.complete) {
        const ptrn = ctx.createPattern(bgImage, 'repeat');
        ctx.fillStyle = ptrn;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (gameManager.isGameOver) {
        gameManager.drawUI();
        return;
    }

    if (player.position.y > canvas.height) {
        gameManager.handlePlayerDeath();
    }

    collisionBlocks.forEach(block => block.draw());

    if (gameManager.villain) {
        gameManager.villain.update(player);
        
        // CORREÇÃO: Verifica se a flag de remoção foi ativada (após 5s)
        if (gameManager.villain.markedForDeletion) {
            gameManager.villain = null; 
            gameManager.checkBossWinCondition();
        } else {
            // Colisão com o Boss (só se ele não estiver morrendo)
            if (gameManager.villain.lives > 0 && checkOverlap(player.hitbox, gameManager.villain.hitbox)) {
                if (player.velocity.y > 0 && player.hitbox.position.y < gameManager.villain.hitbox.position.y) {
                    if (!gameManager.villain.invulnerable) {
                        gameManager.villain.takeDamage();
                        const dir = player.position.x < gameManager.villain.position.x ? -1 : 1;
                        player.applyKnockback(dir);
                    }
                } else {
                    if (!gameManager.villain.invulnerable) {
                        gameManager.handlePlayerDeath();
                    }
                }
            }
        }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.update();

        const dist = Math.hypot(p.position.x - (player.position.x + 16), p.position.y - (player.position.y + 22));
        if (dist < p.radius + 15) { 
            projectiles.splice(i, 1);
            gameManager.handlePlayerDeath();
            continue;
        }

        if (p.position.x < 0 || p.position.x > canvas.width || p.position.y > canvas.height) {
            projectiles.splice(i, 1);
        }
    }

    for (let i = fruits.length - 1; i >= 0; i--) {
        const fruit = fruits[i];
        fruit.update();
        if (checkOverlap(player.hitbox, fruit.hitbox)) {
            fruits.splice(i, 1);
            playSound('collect');
            gameManager.checkWinCondition();
        }
    }
    
    traps.forEach(trap => {
        trap.update();
        if (checkOverlap(player.hitbox, trap.hitbox)) {
             gameManager.handlePlayerDeath();
        }
    })

    if (player.knockbackTimer === 0) {
        player.velocity.x = 0;
        if (keys.right.pressed) player.velocity.x = player.speed;
        else if (keys.left.pressed) player.velocity.x = -player.speed;
    }
    
    player.update();
    gameManager.drawUI();
}

animate();