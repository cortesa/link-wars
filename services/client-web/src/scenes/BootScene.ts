import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Display loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '32px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5);

    // TODO: Load game assets here
    // this.load.image('logo', 'assets/logo.png');
    // this.load.audio('bgm', 'assets/audio/bgm.mp3');
  }

  create() {
    console.log('BootScene: Assets loaded');
    // Transition to menu scene
    this.scene.start('MenuScene');
  }
}
