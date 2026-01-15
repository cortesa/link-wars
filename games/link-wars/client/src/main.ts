import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.ts";
import { GameScene } from "./scenes/GameScene.ts";
import { MenuScene } from "./scenes/MenuScene.ts";
import "./style.css";

// Check if mobile device
const isMobile = window.innerWidth <= 1024;

// Mobile always uses portrait dimensions, desktop uses landscape
const gameWidth = isMobile ? 720 : 1280;
const gameHeight = isMobile ? 1280 : 720;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: gameWidth,
  height: gameHeight,
  parent: "game-container",
  backgroundColor: "#2d2d2d",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: gameWidth,
    height: gameHeight,
  },
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
};

// Initialize the game
const game = new Phaser.Game(config);

// Force Phaser to refresh scale on window resize or orientation change
const refreshScale = () => {
  game.scale.refresh();
};

window.addEventListener("resize", refreshScale);
window.addEventListener("orientationchange", () => {
  setTimeout(refreshScale, 100);
});

console.log("🎮 Link Wars - Phaser Game Initialized");
console.log("📦 Phaser version:", Phaser.VERSION);
console.log("📱 Device:", isMobile ? "Mobile" : "Desktop");
console.log("📐 Canvas dimensions:", gameWidth, "x", gameHeight);

// Export for debugging
(window as any).game = game;
