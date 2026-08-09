import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
const titleScreen = document.getElementById('title-screen');
const startButton = document.getElementById('start-button');

const game = new Game(canvas);
game.renderTitleBackdrop();

startButton.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  document.body.classList.add('playing');
  if (window.matchMedia('(pointer: coarse)').matches) {
    document.body.classList.add('touch');
  }
  game.start();
});
