class Porta {
    constructor(context, imagem) {
        this.context = context;
        this.img = imagem;

        this.x = 520;   // AJUSTE PARA SUA PRISÃO
        this.y = 210;   // AJUSTE PARA SUA PRISÃO

        this.w = 150;   // largura desenhada no cenário
        this.h = 180;   // altura desenhada no cenário

        // spritesheet: 4 frames horizontais
        this.frameCount = 4;
        this.currentFrame = 0;
        this.frameWidth = this.img.width / this.frameCount;
        this.frameHeight = this.img.height;

        this.opening = false;
        this.opened = false;

        this.hitsToOpen = 2;
        this.currentHits = 0;
    }

    hit() {
        if (this.opened || this.opening) return;

        this.currentHits++;

        if (this.currentHits >= this.hitsToOpen) {
            this.opening = true;
        }
    }

    atualizar() {
        if (this.opening && !this.opened) {
            if (this.currentFrame < this.frameCount - 1) {
                this.currentFrame++;
            } else {
                this.opened = true;
                this.opening = false;

                // Liberta Lestat
                if (window.lestat) {
                    lestat.preso = false;
                    lestat.seguindo = true;
                }
            }
        }
    }

    desenhar() {
        this.context.drawImage(
            this.img,
            this.currentFrame * this.frameWidth,
            0,
            this.frameWidth,
            this.frameHeight,
            this.x,
            this.y,
            this.w,
            this.h
        );
    }

    // --------- COLISOR ----------
    retangulosColisao() {
        if (this.opened) return [];
        return [{
            x: this.x,
            y: this.y,
            largura: this.w,
            altura: this.h
        }];
    }

    colidiuCom(outro) {
        // Quando o Grom atacar a porta
        if (outro.atacando) {
            this.hit();
        }
    }
}
