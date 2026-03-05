import { describe, it, expect } from 'vitest';
import { estimateMealByHand } from './nutrition';

describe('estimateMealByHand', () => {
  it('should return default values when no arguments are provided', () => {
    const result = estimateMealByHand();
    expect(result).toEqual({
      protein_g: 25,
      carbs_g: 20,
      fat_g: 5,
      kcal: 150 + 80 + 45 + 25 // 300
    });
  });

  it('should handle all zeros', () => {
    const result = estimateMealByHand({
      proteinPalms: 0,
      carbCuppedHands: 0,
      fatThumbs: 0,
      vegFists: 0,
    });
    expect(result).toEqual({
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      kcal: 0
    });
  });

  it('should handle mixed decimals', () => {
    const result = estimateMealByHand({
      proteinPalms: 0.5,
      carbCuppedHands: 1.5,
      fatThumbs: 0.2,
      vegFists: 2,
    });
    // protein: 0.5 * 25 = 12.5
    // carbs: 1.5 * 20 = 30
    // fat: 0.2 * 5 = 1
    // kcal: 0.5*150 + 1.5*80 + 0.2*45 + 2*25 = 75 + 120 + 9 + 50 = 254
    expect(result.protein_g).toBe(12.5);
    expect(result.carbs_g).toBe(30);
    expect(result.fat_g).toBe(1);
    expect(result.kcal).toBe(254);
  });

  it('should handle missing fields by using defaults', () => {
    const result = estimateMealByHand({
      proteinPalms: 2,
      // carbCuppedHands missing -> default 1
      // fatThumbs missing -> default 1
      // vegFists missing -> default 1
    });
    expect(result).toEqual({
      protein_g: 50,
      carbs_g: 20,
      fat_g: 5,
      kcal: 2 * 150 + 80 + 45 + 25 // 300 + 150 = 450
    });
  });

  it('should correctly calculate a typical meal', () => {
    const result = estimateMealByHand({
      proteinPalms: 1,
      carbCuppedHands: 2,
      fatThumbs: 1,
      vegFists: 1,
    });
    expect(result).toEqual({
      protein_g: 25,
      carbs_g: 40,
      fat_g: 5,
      kcal: 150 + 160 + 45 + 25 // 380
    });
  });
});
