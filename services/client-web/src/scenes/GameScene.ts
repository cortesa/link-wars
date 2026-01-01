import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    const title = this.add.text(width / 2, 50, 'GAME SCENE', {
      fontSize: '32px',
      color: '#ffffff',
    });
    title.setOrigin(0.5);

    // Placeholder for game area
    const gameArea = this.add.rectangle(
      width / 2,
      height / 2,
      800,
      500,
      0x16213e
    );
    gameArea.setStrokeStyle(2, 0x0f3460);

    // Info text
    const infoText = this.add.text(
      width / 2,
      height / 2,
      'Game logic will be implemented here\n\nTowers, Links, and Units coming soon...',
      {
        fontSize: '20px',
        color: '#cccccc',
        align: 'center',
      }
    );
    infoText.setOrigin(0.5);

    // Back button
    const backButton = this.add.text(50, 50, '← Back to Menu', {
      fontSize: '20px',
      color: '#00ff00',
    });
    backButton.setInteractive({ useHandCursor: true });

    backButton.on('pointerover', () => {
      backButton.setStyle({ color: '#ffffff' });
    });

    backButton.on('pointerout', () => {
      backButton.setStyle({ color: '#00ff00' });
    });

    backButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    console.log('GameScene: Ready for implementation');
  }

  update() {
    // Game loop will be implemented here
  }
}
