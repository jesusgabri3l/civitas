import type { StageId } from '../../state/appStore';
import type { Stage, StageHost, StageLoaders, StageStatus } from './Stage';

interface Entry {
  status: StageStatus;
  stage: Stage | null;
  preparing: Promise<Stage> | null;
}

/**
 * Owns the lifecycle of every stage. Each stage is a dynamic import, so its code and assets only download when
 * needed. At most `maxWarmStages` inactive stages keep their GPU resources (oldest goes to sleep first).
 */
export class StageManager {
  private readonly entries = new Map<StageId, Entry>();
  /** Inactive warm stages, least recently used first. */
  private warmOrder: StageId[] = [];
  private activeId: StageId | null = null;

  constructor(
    private readonly loaders: StageLoaders,
    private readonly host: StageHost,
    private maxWarmStages: number,
  ) {}

  get active(): Stage | null {
    return this.activeId ? (this.entries.get(this.activeId)?.stage ?? null) : null;
  }

  statusOf(id: StageId): StageStatus {
    return this.entries.get(id)?.status ?? 'idle';
  }

  statuses(): Record<string, StageStatus> {
    return Object.fromEntries(Object.keys(this.loaders).map((id) => [id, this.statusOf(id as StageId)]));
  }

  setMaxWarmStages(count: number) {
    this.maxWarmStages = count;
    this.enforceWarmLimit();
  }

  /** load -> warm. Safe to call many times: concurrent calls share the same work. */
  async preload(id: StageId): Promise<Stage> {
    const entry = this.entryFor(id);
    if (entry.stage && (entry.status === 'warm' || entry.status === 'active')) return entry.stage;
    if (!entry.preparing) {
      entry.preparing = this.prepare(id, entry).finally(() => {
        entry.preparing = null;
      });
    }
    return entry.preparing;
  }

  /** Makes a stage the active one. The previous active becomes warm (or sleeps if over the limit). */
  async activate(id: StageId): Promise<Stage> {
    const stage = await this.preload(id);
    if (this.activeId === id) return stage;

    const previousId = this.activeId;
    if (previousId) {
      const previous = this.entries.get(previousId);
      previous?.stage?.deactivate();
      if (previous) previous.status = 'warm';
      this.warmOrder.push(previousId);
    }
    this.warmOrder = this.warmOrder.filter((warmId) => warmId !== id);
    this.entryFor(id).status = 'active';
    this.activeId = id;
    stage.activate();
    this.enforceWarmLimit();
    return stage;
  }

  sleep(id: StageId) {
    const entry = this.entries.get(id);
    if (!entry?.stage || id === this.activeId) return;
    if (entry.status !== 'warm' && entry.status !== 'loaded') return;
    entry.stage.sleep();
    entry.status = 'asleep';
    this.warmOrder = this.warmOrder.filter((warmId) => warmId !== id);
  }

  /** Puts every inactive stage to sleep (e.g. on memory pressure). */
  sleepInactive() {
    [...this.warmOrder].forEach((id) => this.sleep(id));
  }

  dispose(id: StageId) {
    const entry = this.entries.get(id);
    if (!entry?.stage) return;
    if (id === this.activeId) this.activeId = null;
    entry.stage.dispose();
    this.entries.delete(id);
    this.warmOrder = this.warmOrder.filter((warmId) => warmId !== id);
  }

  disposeAll() {
    [...this.entries.keys()].forEach((id) => this.dispose(id));
  }

  private entryFor(id: StageId): Entry {
    let entry = this.entries.get(id);
    if (!entry) {
      entry = { status: 'idle', stage: null, preparing: null };
      this.entries.set(id, entry);
    }
    return entry;
  }

  private async prepare(id: StageId, entry: Entry): Promise<Stage> {
    if (!entry.stage) {
      entry.status = 'loading';
      const { createStage } = await this.loaders[id]();
      const stage = createStage(this.host);
      await stage.load();
      entry.stage = stage;
    }
    entry.status = 'loaded';
    await this.host.compile(entry.stage);
    // The stage may have been disposed or activated while compiling.
    if (this.entries.get(id) !== entry) return entry.stage;
    if (this.activeId !== id) {
      entry.status = 'warm';
      this.warmOrder = [...this.warmOrder.filter((warmId) => warmId !== id), id];
      this.enforceWarmLimit(id);
    }
    return entry.stage;
  }

  private enforceWarmLimit(keep?: StageId) {
    while (this.warmOrder.length > this.maxWarmStages) {
      const oldest = this.warmOrder.find((warmId) => warmId !== keep);
      if (!oldest) return;
      this.sleep(oldest);
    }
  }
}
