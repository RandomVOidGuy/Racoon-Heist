// Unified input: WASD / arrow keys on desktop, drag joystick on touch.
// Exposes `direction` as {x, z} each in [-1, 1].
export class Controls {
  constructor() {
    this.direction = { x: 0, z: 0 };
    this.keys = new Set();
    this.joystick = document.getElementById('joystick');
    this.nub = this.joystick ? this.joystick.querySelector('.nub') : null;
    this.touchId = null;
  }

  attach() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.updateFromKeys();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.updateFromKeys();
    });

    if (this.joystick) {
      window.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
      window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
      window.addEventListener('touchend', (e) => this.onTouchEnd(e));
      window.addEventListener('touchcancel', (e) => this.onTouchEnd(e));
    }
  }

  updateFromKeys() {
    const k = this.keys;
    let x = 0;
    let z = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z += 1;
    this.direction.x = x;
    this.direction.z = z;
  }

  joystickCenter() {
    const r = this.joystick.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, radius: r.width / 2 };
  }

  onTouchStart(e) {
    if (this.touchId !== null) return;
    const touch = e.changedTouches[0];
    this.touchId = touch.identifier;
    this.trackTouch(touch);
    e.preventDefault();
  }

  onTouchMove(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === this.touchId) {
        this.trackTouch(touch);
        e.preventDefault();
      }
    }
  }

  onTouchEnd(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === this.touchId) {
        this.touchId = null;
        this.direction.x = 0;
        this.direction.z = 0;
        if (this.nub) this.nub.style.transform = 'translate(-50%, -50%)';
      }
    }
  }

  trackTouch(touch) {
    const { cx, cy, radius } = this.joystickCenter();
    let dx = (touch.clientX - cx) / radius;
    let dy = (touch.clientY - cy) / radius;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    this.direction.x = dx;
    this.direction.z = dy;
    if (this.nub) {
      this.nub.style.transform = `translate(calc(-50% + ${dx * radius * 0.6}px), calc(-50% + ${dy * radius * 0.6}px))`;
    }
  }
}
