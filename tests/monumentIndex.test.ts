import { describe, expect, it } from 'vitest';
import { cities } from '../src/cities';
import { monumentIndex } from '../src/data/monumentIndex';
import { normalizeText, searchMonuments } from '../src/data/monumentSearch';

// Guard of the rule "every monument page is indexed": a new city fails here if it is not findable or still sits in `soon`.
describe('monument index', () => {
  it('opens every registered city, once', () => {
    for (const city of cities) {
      const rows = monumentIndex.filter((entry) => entry.destination === city.id);
      expect(rows, city.id).toHaveLength(1);
    }
  });

  it('keeps no `soon` row for a monument that already has its page', () => {
    for (const city of cities) {
      const twins = monumentIndex.filter((entry) => !entry.destination && normalizeText(entry.monument) === normalizeText(city.monument));
      expect(twins, city.id).toHaveLength(0);
    }
  });

  it('finds every city by its monument and its city name', () => {
    for (const city of cities) {
      expect(searchMonuments(city.monument).some((entry) => entry.destination === city.id), city.monument).toBe(true);
      expect(searchMonuments(city.name).some((entry) => entry.destination === city.id), city.name).toBe(true);
    }
  });
});
