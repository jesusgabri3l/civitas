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
  /** Stages that never go to sleep (the hub the user always comes back to). */
  private readonly pinned = new Set<StageId>();

  constructor(
    private readonly loaders: StageLoaders,
    private readonly host: StageHost,
    private maxWarmStages: number,
  ) {}

  get active(): Stage | null {
    return this.activeId ? (this.entries.get(this.activeId)?.stage ?? null) : null;
  }

  /** The stage if it is loaded (any state), without touching its lifecycle. */
  get(id: StageId): Stage | null {
    return this.entries.get(id)?.stage ?? null;
  }

  /** Keeps a stage out of the warm limit: it stays warm once it is. */
  pin(id: StageId) {
    this.pinned.add(id);
  }

  isReady(id: StageId): boolean {
    const status = this.statusOf(id);
    return status === 'warm' || status === 'active';
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

  /**
   * load -> warm. Safe to call many times: concurrent calls share the same work.
   * `speculative` (hover, a row the visitor lingers on): never evicts another warm stage. Without a free slot it only loads, so
   * moving the pointer across the globe does not put stages to sleep and recompile them over and over.
   */
  async preload(id: StageId, { speculative = false } = {}): Promise<Stage> {
    const entry = this.entryFor(id);
    if (entry.stage && (entry.status === 'warm' || entry.status === 'active')) return entry.stage;
    if (speculative && entry.stage && !this.hasRoomToWarm()) return entry.stage;
    if (entry.preparing) {
      // A committed request must not settle for a speculative run that may have stopped at `loaded` (no room to warm).
      return speculative ? entry.preparing : entry.preparing.then(() => this.preload(id));
    }
    entry.preparing = this.prepare(id, entry, speculative).finally(() => {
      entry.preparing = null;
    });
    return entry.preparing;
  }

  /** Makes a stage the active one. The previous active becomes warm (or sleeps if over the limit). */
  async activate(id: StageId): Promise<Stage> {
    const stage = await this.preload(id);
    this.makeActive(id, stage);
    return stage;
  }

  /** Same as `activate`, but synchronous: only works on a stage that is already warm (returns null otherwise). */
  activateIfReady(id: StageId): Stage | null {
    const stage = this.get(id);
    if (!stage || !this.isReady(id)) return null;
    this.makeActive(id, stage);
    return stage;
  }

  private makeActive(id: StageId, stage: Stage) {
    if (this.activeId === id) return;

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
  }

  sleep(id: StageId) {
    const entry = this.entries.get(id);
    if (!entry?.stage || id === this.activeId || this.pinned.has(id)) return;
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

  private hasRoomToWarm(): boolean {
    return this.warmOrder.filter((warmId) => !this.pinned.has(warmId)).length < this.maxWarmStages;
  }

  private async prepare(id: StageId, entry: Entry, speculative: boolean): Promise<Stage> {
    if (!entry.stage) {
      entry.status = 'loading';
      const { createStage } = await this.loaders[id]();
      const stage = createStage(this.host);
      await stage.load();
      entry.stage = stage;
    }
    entry.status = 'loaded';
    if (speculative && !this.hasRoomToWarm()) return entry.stage;
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
    const sleepable = () => this.warmOrder.filter((warmId) => !this.pinned.has(warmId));
    while (sleepable().length > this.maxWarmStages) {
      const oldest = sleepable().find((warmId) => warmId !== keep);
      if (!oldest) return;
      this.sleep(oldest);
    }
  }
}
