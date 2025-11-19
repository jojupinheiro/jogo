const ROBSON_DIREITA = 1;
const ROBSON_ESQUERDA = 2;
const ROBSON_CIMA = 1;
const ROBSON_BAIXO = 0;
const ROBSON_PARADO = 0;

class Robson {
  constructor(context, teclado, imagemMover, imagemAtacar) {
    this.context = context;
    this.teclado = teclado;
    this.x = 0;
    this.y = 0;
    this.velocidade = 3;

    // Sprites de movimento e ataque
    this.sheet = new Spritesheet(context, imagemMover, 4, 6);
    this.sheet.intervalo = 40;

    this.sheetAtaque = new Spritesheet(context, imagemAtacar, 4, 8);
    this.sheetAtaque.intervalo = 40;

    // Estado inicial
    this.andando = false;
    this.atacando = false;
    this.direcao = ROBSON_DIREITA;
    this.vilaoMorto = false;
  }

  atualizar() {
    // Movimentação 
    if (this.teclado.pressionada(SETA_DIREITA)) {
      if (!this.andando || this.direcao !== ROBSON_DIREITA) {
        this.sheet.linha = 3;
        this.sheet.coluna = 0;
      }

      this.andando = true;
      this.direcao = ROBSON_DIREITA;
      this.sheet.proximoQuadro();
      this.x += this.velocidade;
      this.atacando = false;
    }

    else if (this.teclado.pressionada(SETA_ESQUERDA)) {

      if (!this.andando || this.direcao !== ROBSON_ESQUERDA) {
        this.sheet.linha = 2;
        this.sheet.coluna = 0;
      }

      this.andando = true;
      this.direcao = ROBSON_ESQUERDA;
      this.sheet.proximoQuadro();
      this.x -= this.velocidade;
      this.atacando = false;
    }

    // Ataque
    else if (this.teclado.pressionada(ESPACO)) {
      this.atacando = true;
      this.andando = false;

      if (this.direcao === ROBSON_ESQUERDA) {
        this.sheetAtaque.linha = 2; // linha para ataque à esquerda
      } else if (this.direcao === ROBSON_DIREITA) {
        this.sheetAtaque.linha = 3; // linha para ataque à direita
      }

      this.sheetAtaque.proximoQuadro();

    }

    // Parado
    else {
      this.andando = false;
      this.atacando = false;
      this.sheet.coluna = 0;
    }
  }

  desenhar() {
    if (this.atacando) {
      this.sheetAtaque.desenhar(this.x, this.y);
    } else {
      this.sheet.desenhar(this.x, this.y);
    }
  }

  retangulosColisao() {
    // Se não estiver atacando, não há colisão
    if (!this.atacando) return [];

    // Define o frame ativo do golpe dependendo da direção
    let frameDoGolpe;
    if (this.direcao === ROBSON_DIREITA) {
      frameDoGolpe = 5; // frame de ataque para a direita
    } else if (this.direcao === ROBSON_ESQUERDA) {
      frameDoGolpe = 5; // frame de ataque para a esquerda
    }

    // Só retorna retângulo se estiver no frame do golpe
    if (this.sheetAtaque.coluna !== frameDoGolpe) return [];

    // Área do golpe dependendo da direção
    if (this.direcao === ROBSON_DIREITA) {
      return [
        { x: this.x + 40, y: this.y + 10, largura: 50, altura: 40 }
      ];
    } else if (this.direcao === ROBSON_ESQUERDA) {
      return [
        { x: this.x - 30, y: this.y + 10, largura: 50, altura: 40 }
      ];
    }

    return [];
  }

  colidiuCom() {
    // Quando o golpe do ROBSON atingir o vilão
    teclado.pressionadas[32] = false;
    teclado.disparadas[32] = false;

    // Mostra mensagem de vitória no jogo
    alert("🎉 PARABÉNS! Você derrotou o vilão!");

    //Chama a função global que libera o formulário
    if (typeof vilaoDerrotado === 'function') {
      vilaoDerrotado();
    }
  }

}
