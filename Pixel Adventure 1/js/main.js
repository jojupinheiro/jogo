// --- INICIALIZAÇÃO ---
player = new Player();
const gameManager = new GameManager();

// Inicia a primeira fase
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

// --- LOOP PRINCIPAL ---
function animate() {
    window.requestAnimationFrame(animate);
    
    // Fundo
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

    // Morte por queda
    if (player.position.y > canvas.height) {
        gameManager.handlePlayerDeath();
    }

    collisionBlocks.forEach(block => block.draw());

    // Lógica do Vilão
    if (gameManager.villain) {
        gameManager.villain.update(player);
        
        if (gameManager.villain.markedForDeletion) {
            gameManager.villain = null; 
            gameManager.checkBossWinCondition();
        } else {
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

    // Projéteis
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

    // Frutas
    for (let i = fruits.length - 1; i >= 0; i--) {
        const fruit = fruits[i];
        fruit.update();
        if (checkOverlap(player.hitbox, fruit.hitbox)) {
            fruits.splice(i, 1);
            playSound('collect');
            gameManager.checkWinCondition();
        }
    }
    
    // Espinhos
    traps.forEach(trap => {
        trap.update();
        if (checkOverlap(player.hitbox, trap.hitbox)) {
             gameManager.handlePlayerDeath();
        }
    })

    // Player
    if (player.knockbackTimer === 0) {
        player.velocity.x = 0;
        if (keys.right.pressed) player.velocity.x = player.speed;
        else if (keys.left.pressed) player.velocity.x = -player.speed;
    }
    
    player.update();
    gameManager.drawUI();
}

animate();