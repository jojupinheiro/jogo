class Animacao {
  constructor(context) {
    this.context = context;
    this.sprites = [];
    this.processamentos = [];
    this.ligado = false;
  }

  novoSprite(sprite) {
    this.sprites.push(sprite);
  }

  novoProcessamento(processamento) {
    this.processamentos.push(processamento);
  }

  ligar() {
    this.ligado = true;
    this.proximoFrame();
  }

  desligar() {
    this.ligado = false;
  }

  proximoFrame() {
    if (!this.ligado) return;

    this.limparTela();

    // Atualiza e desenha os sprites
    for (let sprite of this.sprites) {
      sprite.atualizar();
    }

    for (let sprite of this.sprites) {
      sprite.desenhar();
    }

    // Executa os processamentos extras
    for (let p of this.processamentos) {
      p.processar();
    }

    requestAnimationFrame(() => this.proximoFrame());
  }

  limparTela() {
    const ctx = this.context;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
}
