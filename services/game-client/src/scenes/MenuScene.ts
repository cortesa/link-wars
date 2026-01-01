import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    const title = this.add.text(width / 2, height / 3, 'LINK WARS', {
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(
      width / 2,
      height / 3 + 80,
      'Tower War Multiplayer Game',
      {
        fontSize: '24px',
        color: '#cccccc',
      }
    );
    subtitle.setOrigin(0.5);

    // Play button
    const playButton = this.add.text(width / 2, height / 2 + 50, 'PLAY', {
      fontSize: '32px',
      color: '#00ff00',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 },
    });
    playButton.setOrigin(0.5);
    playButton.setInteractive({ useHandCursor: true });

    playButton.on('pointerover', () => {
      playButton.setStyle({ color: '#ffffff', backgroundColor: '#00ff00' });
    });

    playButton.on('pointerout', () => {
      playButton.setStyle({ color: '#00ff00', backgroundColor: '#333333' });
    });

    playButton.on('pointerdown', () => {
      console.log('Starting game...');
      this.scene.start('GameScene');
    });

    // Info text
    const infoText = this.add.text(
      width / 2,
      height - 50,
      'Authentication and multiplayer coming soon...',
      {
        fontSize: '16px',
        color: '#888888',
      }
    );
    infoText.setOrigin(0.5);
  }
}
