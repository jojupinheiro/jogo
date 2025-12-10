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