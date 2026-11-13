// Input intent only: no world state or network access.
export type TouchPoint = {
  id: number;
  x: number;
  y: number;
  time: number;
  right: boolean;
  interactive: boolean;
  aimX?: number;
};
export type TouchHooks = {
  mode: () => boolean;
  joystick: () => boolean;
  walk: (x: number, y: number) => void;
  stop: () => void;
  look: (x: number, y: number) => void;
  pinch: (ratio: number, angle: number) => void;
  tap: (id: number) => void;
  focus: (id: number) => void;
  feedback: (x: number, y: number, active: boolean) => void;
};
export class VillageTouch {
  points = new Map<number, TouchPoint>();
  origin?: TouchPoint;
  last?: TouchPoint;
  held = false;
  looking = false;
  multi = false;
  lastTap?: TouchPoint;
  distance = 0;
  angle = 0;
  constructor(
    public hooks: TouchHooks,
    public threshold = 280,
  ) {}
  down(p: TouchPoint) {
    this.points.set(p.id, p);
    if (this.points.size > 1) {
      this.multi = true;
      this.held = false;
      this.hooks.stop();
      this.hooks.feedback(0, 0, false);
      this.measure();
      return;
    }
    this.origin = { ...p };
    this.last = { ...p };
    this.held = false;
    this.looking = false;
  }
  measure() {
    const p = [...this.points.values()];
    if (p.length < 2) return;
    this.distance = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y);
    this.angle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
  }
  move(p: TouchPoint) {
    if (!this.points.has(p.id)) return;
    this.points.set(p.id, p);
    if (this.points.size > 1) {
      const oldD = this.distance,
        oldA = this.angle;
      this.measure();
      if (oldD > 0) {
        let angle = this.angle - oldA;
        angle = Math.atan2(Math.sin(angle), Math.cos(angle));
        this.hooks.pinch(this.distance / oldD, angle);
      }
      return;
    }
    if (this.multi || !this.origin || !this.last) return;
    const dx = p.x - this.last.x,
      dy = p.y - this.last.y;
    if (
      this.hooks.mode() &&
      !this.held &&
      this.origin.right &&
      Math.hypot(p.x - this.origin.x, p.y - this.origin.y) > 8
    ) {
      this.looking = true;
      this.hooks.stop();
      this.hooks.look(dx, dy);
    }
    if (this.held) this.steer(p);
    this.last = { ...p };
  }
  steer(p: TouchPoint) {
    if (!this.origin) return;
    let x =
        (p.x - this.origin.x) / 60 +
        (this.hooks.joystick() ? 0 : (this.origin.aimX ?? 0) * 0.8),
      y = (p.y - this.origin.y) / 60 - (this.hooks.joystick() ? 0 : 1);
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    this.hooks.walk(x, y);
    this.hooks.feedback(p.x, p.y, true);
  }
  tick(now: number) {
    if (
      !this.hooks.mode() ||
      this.multi ||
      this.looking ||
      this.held ||
      !this.origin ||
      this.origin.interactive ||
      this.points.size !== 1
    )
      return;
    if (
      now - this.origin.time >=
      (this.hooks.joystick() && !this.origin.right ? 0 : this.threshold)
    ) {
      this.held = true;
      this.steer(this.points.get(this.origin.id)!);
    }
  }
  up(id: number, now: number) {
    const p = this.points.get(id),
      o = this.origin;
    this.points.delete(id);
    const moved = p && o ? Math.hypot(p.x - o.x, p.y - o.y) : Infinity;
    if (
      !this.multi &&
      !this.held &&
      !this.looking &&
      p &&
      o &&
      moved < 8 &&
      now - o.time < this.threshold
    ) {
      if (
        !this.hooks.mode() &&
        !o.interactive &&
        this.lastTap &&
        now - this.lastTap.time < 320 &&
        Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 24
      ) {
        this.hooks.focus(id);
        this.lastTap = undefined;
      } else {
        this.hooks.tap(id);
        this.lastTap = { ...p, time: now };
      }
    }
    this.hooks.stop();
    this.hooks.feedback(0, 0, false);
    this.held = false;
    this.origin = undefined;
    this.last = undefined;
    if (this.points.size === 0) this.multi = false;
  }
  cancel() {
    this.points.clear();
    this.origin = undefined;
    this.last = undefined;
    this.multi = false;
    this.held = false;
    this.looking = false;
    this.lastTap = undefined;
    this.hooks.stop();
    this.hooks.feedback(0, 0, false);
  }
}
export type WalkPoint = { x: number; y: number };
export class SavedWalker {
  position: WalkPoint;
  active = false;
  speed = 0;
  input = { x: 0, y: 0 };
  lastTime = 0;
  lastWrite = -Infinity;
  pending = false;
  dirty = false;
  disposed = false;
  error = false;
  constructor(
    public hooks: {
      position: () => WalkPoint;
      heading: () => number;
      speed: () => number;
      canMove: (a: WalkPoint, b: WalkPoint) => boolean;
      persist: (p: WalkPoint) => Promise<void>;
      changed: () => void;
      failed: (message: string) => void;
      manual: () => void;
    },
  ) {
    this.position = { ...hooks.position() };
  }
  inputMove(x: number, y: number) {
    if (this.disposed) return;
    if (!this.active) {
      this.position = { ...this.hooks.position() };
      this.hooks.manual();
    }
    this.active = true;
    this.error = false;
    this.input = { x, y };
  }
  tick(now: number) {
    const dt = this.lastTime
      ? Math.min(0.25, Math.max(0, (now - this.lastTime) / 1000))
      : 0;
    this.lastTime = now;
    if (!this.active || this.disposed) return;
    this.speed = Math.min(this.hooks.speed(), this.speed + 8 * dt);
    const yaw = this.hooks.heading(),
      x = this.input.x * Math.cos(yaw) + this.input.y * Math.sin(yaw),
      y = -this.input.x * Math.sin(yaw) + this.input.y * Math.cos(yaw),
      to = {
        x: this.position.x + x * this.speed * dt,
        y: this.position.y + y * this.speed * dt,
      };
    if (
      this.hooks.canMove(this.position, to) &&
      this.hooks.canMove(this.hooks.position(), to)
    ) {
      if (Math.hypot(to.x - this.position.x, to.y - this.position.y) > 0.0001) {
        this.position = to;
        this.dirty = true;
        this.hooks.changed();
      }
    } else {
      this.speed = 0;
      if (!this.error) {
        this.error = true;
        this.hooks.failed("That way is blocked. Turn or walk around.");
      }
    }
    if (now - this.lastWrite >= 500) void this.flush(now);
  }
  async flush(now: number) {
    if (this.pending || !this.dirty || this.disposed) return;
    this.pending = true;
    this.lastWrite = now;
    const target = { ...this.position };
    this.dirty = false;
    try {
      await this.hooks.persist(target);
    } catch {
      this.active = false;
      this.speed = 0;
      this.dirty = false;
      this.position = { ...this.hooks.position() };
      this.hooks.failed(
        "That movement did not save. You’re back at your last saved position.",
      );
    } finally {
      this.pending = false;
      this.hooks.changed();
      if (!this.active && this.dirty && !this.disposed) void this.flush(now);
    }
  }
  stop() {
    this.active = false;
    this.speed = 0;
    this.input = { x: 0, y: 0 };
    void this.flush(this.lastTime);
    this.hooks.changed();
  }
  dispose() {
    this.stop();
    this.disposed = true;
  }
}
