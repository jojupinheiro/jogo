<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IFGAME</title>
<style>
    canvas {
        border: 1px solid black;
        display: block;
        margin: 0 auto;
        background-color: #87CEEB; /* Céu azul */
    }
    .victory-screen {
        display: none;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(255, 255, 255, 0.9);
        padding: 20px;
        border: 2px solid black;
        border-radius: 10px;
        text-align: center;
    }
</style>
</head>
<body>
<canvas id="gameCanvas" width="800" height="400"></canvas>
<div class="victory-screen" id="victory-screen">
    <h2>Fim de jogo!</h2>
    <p>Tempo total: <span id="timeElapsed"></span> segundos</p>
</div>
<script>
    // Classe Aluno
 // Classe Aluno
    class Aluno {
        constructor(x, y, width, height, speed, jumpStrength) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.speed = speed;
            this.jumpStrength = jumpStrength;
            this.jumping = false;
            this.grounded = false;
            this.velocityY = 0;
        }

        jump() {
            if (this.grounded) {
                this.jumping = true;
                this.grounded = false;
                this.velocityY = -this.jumpStrength;
            }
        }

        update() {
            if (!this.grounded) {
                this.velocityY += 0.5;
            }
            this.y += this.velocityY;

            if (this.y >= canvas.height - this.height) {
                this.y = canvas.height - this.height;
                this.grounded = true;
                this.velocityY = 0;
            }
        }

        draw(ctx) {
            ctx.fillStyle = 'blue';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }


    // Classe Block
    class Block {
        constructor(x, y, width, height, color, type) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = color;
            this.type = type; // "normal", "bitcoin", "hole", "finish"
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    // Classe VictoryScreen
    class VictoryScreen {
        constructor(elementId) {
            this.element = document.getElementById(elementId);
        }

        show(timeElapsed) {
            const timeElapsedElement = this.element.querySelector('#timeElapsed');
            timeElapsedElement.textContent = timeElapsed.toFixed(2);
            this.element.style.display = 'block';
        }
    }

    // Canvas setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Conexão WebSocket
    const ws = new WebSocket('ws://127.0.0.1:8081');
ws.onopen = () => {
    console.log("Conectado ao servidor WebSocket");
};

ws.onerror = (error) => {
    console.error("Erro no WebSocket:", error);
};

ws.onclose = () => {
    console.log("WebSocket desconectado");
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'keydown') {
        keys[message.key] = true;
        if (message.key === 'ArrowUp') {
            aluno.jump();
        }
    }

    if (message.type === 'keyup') {
        keys[message.key] = false;
    }
};

    // Aluno
    const aluno = new Aluno(50, canvas.height - 120, 50, 50, 5, 15);

    // Controle de teclas
    const keys = {};
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === 'ArrowUp') {
            aluno.jump();
        }
    });
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // String de terreno
    const terrainString = "________*_____*_________________F";

    // Parse da string de terreno
    const terrain = [];
    for (let i = 0; i < terrainString.length; i++) {
        const terrainChar = terrainString.charAt(i);
        if (terrainChar === '_') {
            terrain.push(new Block(i * 50, canvas.height - 50, 50, 50, 'green', 'normal'));
        } else if (terrainChar === '|') {
            terrain.push(new Block(i * 50, canvas.height - 50, 50, 50, 'brown', 'hole'));
        } else if (terrainChar === '*') {
            terrain.push(new Block(i * 50, canvas.height - 120, 50, 50, 'gold', 'bitcoin'));
        } else if (terrainChar === 'F') {
            terrain.push(new Block(i * 50, canvas.height - 50, 50, 50, 'red', 'finish'));
        }
    }

    // Loop do jogo
    let startTime = Date.now();
    let gameEnded = false;

    function gameLoop() {
        if (gameEnded) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Atualizar Aluno
        aluno.update();

        // Movimento do aluno
        if (keys['ArrowLeft'] && aluno.x > 0) {
            aluno.x -= aluno.speed;
        }
        if (keys['ArrowRight']) {
            aluno.x += aluno.speed;
            if (aluno.x > canvas.width / 2) {
                aluno.x = canvas.width / 2;
                terrain.forEach(block => block.x -= aluno.speed);
            }
        }

        // Desenho dos blocos
        terrain.forEach(block => {
            block.draw(ctx);
        });

        // Desenho do aluno
        aluno.draw(ctx);

        // Colisão com os blocos
        terrain.forEach(block => {
            if (
                aluno.x < block.x + block.width &&
                aluno.x + aluno.width > block.x &&
                aluno.y < block.y + block.height &&
                aluno.y + aluno.height > block.y
            ) {
                if (block.type === 'hole') {
                    aluno.y = canvas.height; // Cai no buraco
                    gameEnded = true;
                    alert('Você caiu no buraco!');
                    return;
                }
                if (block.type === 'bitcoin') {
                    block.color = 'gray'; // Marca como coletado
                }
                if (block.type === 'finish') {
                    gameEnded = true;
                    const elapsedTime = (Date.now() - startTime) / 1000;
                    victoryScreen.show(elapsedTime);
                }
            }
        });

        requestAnimationFrame(gameLoop);
    }

    // Tela de vitória
    const victoryScreen = new VictoryScreen('victory-screen');

    // Iniciar o jogo
    gameLoop();
</script>
</body>
</html>
