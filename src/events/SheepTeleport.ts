// A sheep is found on the farmhouse roof. Interact with the front door to
// fetch the ladder and bring it down.
import { TILE } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { LAYOUT, penLayout } from '../world/layout';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';

export class SheepTeleport extends ChaosEvent {
  readonly id = 'sheep_teleport';
  sheepId = '';

  canTrigger(): boolean {
    return this.ctx.animals.list.some((a) => a.type === 'sheep' && !a.escaped && !a.onRoof);
  }

  requirement(): string {
    return 'needs a sheep (buy one at the shop)';
  }

  private roof() {
    return { x: LAYOUT.house.x * TILE + 34, y: LAYOUT.house.y * TILE + 26 };
  }

  private putOnRoof(): void {
    const a = this.ctx.animals.byId(this.sheepId);
    if (!a) return;
    a.onRoof = true;
    a.asleep = false;
    this.ctx.animals.release(a.id);
    this.ctx.animals.setVisible(a, true);
    const r = this.roof();
    this.ctx.animals.place(a, r.x, r.y);
  }

  start(): void {
    const sheep = this.ctx.chaosRng.pick(this.ctx.animals.list.filter((a) => a.type === 'sheep' && !a.escaped && !a.onRoof));
    this.sheepId = sheep.id;
    this.putOnRoof();
    this.ctx.toast(`${sheep.name} is on the roof. Use the front door to fetch a ladder.`, 0xffe58a);
  }

  onInteract(tx: number, ty: number): boolean {
    if (!LAYOUT.houseDoor.some((d) => d.x === tx && d.y === ty)) return false;
    const a = this.ctx.animals.byId(this.sheepId);
    if (!a) return false;
    a.onRoof = false;
    const pen = penLayout(a.pen);
    this.ctx.animals.place(a, tc(pen.door.x), (pen.door.y + 1) * TILE + 4);
    this.ctx.toast(`You fetch the ladder and carry ${a.name} down. It looks smug.`, 0x8fd458);
    audio.play('baa');
    this.done = true;
    return true;
  }

  update(): void {
    const a = this.ctx.animals.byId(this.sheepId);
    if (!a || !a.onRoof) this.done = true;
  }

  location() {
    return this.roof();
  }

  serialize() {
    return { ...super.serialize(), sheepId: this.sheepId };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.sheepId = String(d.sheepId);
    this.putOnRoof();
  }
}
