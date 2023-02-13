const variantFieldsThatShouldNotBeDirectlySet = [
  "_id",
  "ancestors",
  "createdAt",
  "shopId",
  "type",
  "updatedAt",
  "workflow",
];

/**
 * @summary Copies and cleans the UnitVariantInput object accepted by the
 *   createUnitVariant and updateUnitVariant mutations.
 * @param {Object} context App context
 * @param {Object} input Function input
 * @param {Object} input.unitVariantInput UnitVariantInput object to clean
 * @return {Promise<Object>} Cleaned UnitVariantInput
 */
export default async function cleanUnitVariantInput(
  context,
  { unitVariantInput }
) {
  const input = { ...unitVariantInput };

  // UnitVariant.validate call will ensure most validity, but there are certain fields
  // that we never want to allow arbitrary values for because they are controlled by the
  // system. We'll clear those here if someone is trying to set them.
  variantFieldsThatShouldNotBeDirectlySet.forEach((forbiddenField) => {
    delete input[forbiddenField];
  });

  return input;
}
