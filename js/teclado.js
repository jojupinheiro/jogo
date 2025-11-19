// Códigos de teclas
const SETA_ESQUERDA = 37;
const SETA_DIREITA  = 39;
const SETA_CIMA = 38;
const SETA_BAIXO = 40;
const CONTROL = 17;
const ESPACO = 32;

class Teclado {
  constructor(elemento) {
    this.elemento = elemento;

    // Arrays de estado das teclas
    this.pressionadas   = [];
    this.disparadas     = [];
    this.funcoesDisparo = [];

    // Listeners de teclado
    elemento.addEventListener('keydown', (evento) => {
      const tecla = evento.keyCode;
      this.pressionadas[tecla] = true;

      // Disparar somente se for o primeiro keydown da tecla
      if (this.funcoesDisparo[tecla] && !this.disparadas[tecla]) {
        this.disparadas[tecla] = true;
        this.funcoesDisparo[tecla]();
      }
    });

    elemento.addEventListener('keyup', (evento) => {
      this.pressionadas[evento.keyCode] = false;
      this.disparadas[evento.keyCode]   = false;
    });
  }

  pressionada(tecla) {
    return this.pressionadas[tecla];
  }

  disparou(tecla, callback) {
    this.funcoesDisparo[tecla] = callback;
  }
}
