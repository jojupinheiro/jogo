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
const TILE_SIZE = 16 * SCALE_BASE;

// Variáveis de Estado Globais
let isMuted = false;
let gameRunning = true;

// Assets Globais
const bgImage = new Image();
bgImage.src = 'Free/Background/Blue.png';

const volumeImg = new Image();
volumeImg.src = 'Free/Menu/Buttons/Volume.png';

const fruitTypes = [
    'Apple', 'Bananas', 'Cherries', 'Kiwi', 'Melon', 'Orange', 'Pineapple', 'Strawberry'
];

// Listas Globais (Usadas no main e manager)
let collisionBlocks = [];
let fruits = [];
let traps = [];
let projectiles = [];

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

// Função de Colisão Global
function checkOverlap(rect1, rect2) {
    return (
        rect1.position.x <= rect2.position.x + rect2.width &&
        rect1.position.x + rect1.width >= rect2.position.x &&
        rect1.position.y + rect1.height >= rect2.position.y &&
        rect1.position.y <= rect2.position.y + rect2.height
    );
}

let player; // Define a variável globalmente