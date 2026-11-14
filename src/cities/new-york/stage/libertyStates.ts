// States of the maquette of the Statue of Liberty and the heights that tie the figure to the pedestal. Pure (no imports), so
// `scripts/check-liberty-glb.mjs` can run it in Node. Re-exported by `newYorkConfig.ts`.

/** Height of Fort Wood and of the top of Hunt's pedestal over the ground (m): where the figure stands with `pedestal` = 0 and 1. */
export const FORT_HEIGHT = 5;
export const PEDESTAL_TOP = 46.94;

/**
 * The section of the `skin` state removes the half of the figure that faces this direction on the ground plane (x, z): the camera of
 * chapter 1, seen from the axis (`KEYS[1]` in `newYorkConfig.ts` is built from it).
 */
export const CUT_FACING = [70, 30] as const;

/** Height of a point of the pedestal (`y` at rest, over the ground) when it has risen by `pedestal` (0 = flat on the fort, 1 = built). */
export const riseY = (y: number, pedestal: number) => FORT_HEIGHT + (y - FORT_HEIGHT) * pedestal;

/** Where the heels of the figure stand: always the top of the pedestal, wherever it is on its way up. */
export const figureBaseY = (pedestal: number) => riseY(PEDESTAL_TOP, pedestal);

/**
 * State of the maquette, each 0..1: `skin` sweeps a plane that removes the front half of the copper (a clean section) and shows the skeleton, `copper` is 1 for new copper and 0 for
 * today's patina (the change runs from the bottom up), `explode` parts the layers, `pedestal` raises Hunt's pedestal over the fort
 * and `torch` lights the flame.
 */
export interface LibertyState extends Record<string, number> {
  skin: number;
  copper: number;
  explode: number;
  pedestal: number;
  torch: number;
}

/** Today: patina, pedestal up, torch lit. */
export const REST: LibertyState = { skin: 0, copper: 0, explode: 0, pedestal: 1, torch: 1 };
/** State the shaders are compiled in: every kind of piece and color on screen (skeleton, front of the change, lit torch). */
export const WARM_UP: LibertyState = { skin: 0.5, copper: 0.5, explode: 0.5, pedestal: 0.5, torch: 1 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const span = (t: number, from: number, to: number) => ease((t - from) / (to - from));

/**
 * The maquette for each chapter (0 prologue, 1 skeleton, 2 Paris, 3 crates, 4 dedication, 5 patina, 6 explore) at progress `t`.
 * Every chapter starts in the state the previous one ends in, so scrolling is continuous both ways. The chapters themselves are in
 * src/cities/new-york/story.ts (same order).
 */
export function stateFor(chapter: number, t: number): LibertyState {
  switch (chapter) {
    case 0:
      return { ...REST };
    case 1:
      // Back to 1881: the pedestal sinks, the patina gives way to new copper, the torch goes out and the front half of the skin is cut away to show the skeleton.
      return {
        // The chapter's progress ends when its text reaches the top, which is when it is read: the section stays open there and closes as the next chapter comes in.
        skin: span(t, 0.35, 0.75),
        copper: span(t, 0, 0.3),
        explode: 0,
        pedestal: 1 - span(t, 0, 0.3),
        torch: 1 - span(t, 0, 0.25),
      };
    case 2:
      // The whole statue in new copper, with no pedestal: the section of chapter 1 closes while the camera travels here.
      return { skin: 1 - span(t, 0, 0.3), copper: 1, explode: 0, pedestal: 0, torch: 0 };
    case 3:
      // Taken apart in layers while Hunt's pedestal rises over the fort.
      return { skin: 0, copper: 1, explode: span(t, 0, 0.55), pedestal: span(t, 0.35, 0.95), torch: 0 };
    case 4:
      // Put together on the pedestal; the torch is lit.
      return { skin: 0, copper: 1, explode: 1 - span(t, 0.1, 0.6), pedestal: 1, torch: span(t, 0.6, 0.95) };
    case 5:
      // The green runs up from the hem: new copper to today's patina.
      return { skin: 0, copper: 1 - span(t, 0.1, 0.9), explode: 0, pedestal: 1, torch: 1 };
    default:
      return { ...REST };
  }
}

/** With reduced motion each chapter shows the state it ends in. */
export const finalStateFor = (chapter: number): LibertyState => stateFor(chapter, 1);


/** The views of Explore (ids of the buttons in story.ts). The pedestal stays up in all of them so the camera frames the same figure. */
export const VIEWS = {
  today: { ...REST },
  '1886': { skin: 0, copper: 1, explode: 0, pedestal: 1, torch: 1 },
  skeleton: { skin: 1, copper: 1, explode: 0, pedestal: 1, torch: 0 },
} satisfies Record<string, LibertyState>;
