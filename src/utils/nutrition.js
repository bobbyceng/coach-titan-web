/**
 * Estimates meal nutrition based on hand portions.
 * 
 * @param {Object} portions
 * @param {number} [portions.proteinPalms=1]
 * @param {number} [portions.carbCuppedHands=1]
 * @param {number} [portions.fatThumbs=1]
 * @param {number} [portions.vegFists=1]
 * @returns {Object} { protein_g, carbs_g, fat_g, kcal }
 */
export function estimateMealByHand({
  proteinPalms = 1,
  carbCuppedHands = 1,
  fatThumbs = 1,
  vegFists = 1,
} = {}) {
  const protein_g = proteinPalms * 25;
  const carbs_g = carbCuppedHands * 20;
  const fat_g = fatThumbs * 5;
  const kcal =
    proteinPalms * 150 +
    carbCuppedHands * 80 +
    fatThumbs * 45 +
    vegFists * 25;
  return { protein_g, carbs_g, fat_g, kcal };
}
