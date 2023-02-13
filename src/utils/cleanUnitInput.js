import getSlug from "@reactioncommerce/api-utils/getSlug.js";
import createHandle from "./createHandle.js";

const unitFieldsThatShouldNotBeDirectlySet = [
  "_id",
  "ancestors",
  "createdAt",
  "currentUnitHash",
  "parcel",
  "publishedAt",
  "publishedUnitHash",
  "shopId",
  "type",
  "workflow",
];

/**
 * @summary Copies and cleans the UnitInput object accepted by the
 *   createUnit and updateUnit mutations.
 * @param {Object} context App context
 * @param {Object} input Function input
 * @param {String} [input.currentUnitHandle] Current handle, if this is
 *   an update and there is one
 * @param {Object} input.unitId Unit ID for use by `createHandle`
 * @param {Object} input.unitInput UnitInput object to clean
 * @param {Object} input.shopId Shop ID for use by `createHandle`
 * @return {Promise<Object>} Cleaned UnitInput
 */
export default async function cleanUnitInput(
  context,
  { currentUnitHandle, unitId, unitInput, shopId }
) {
  const input = { ...unitInput };

  // Slugify the handle input
  if (typeof input.slug === "string") {
    input.handle = await createHandle(
      context,
      getSlug(input.slug),
      unitId,
      shopId
    );
    delete input.slug;
  }

  // If a title is supplied, and the currently stored unit doesn't have a handle,
  // then slugify the title and save it as the new handle (slug)
  if (typeof input.title === "string" && !currentUnitHandle && !input.handle) {
    input.handle = await createHandle(
      context,
      getSlug(input.title),
      unitId,
      shopId
    );
  }

  // Unit.validate call will ensure most validity, but there are certain fields
  // that we never want to allow arbitrary values for because they are controlled by the
  // system. We'll clear those here if someone is trying to set them.
  unitFieldsThatShouldNotBeDirectlySet.forEach((forbiddenField) => {
    delete input[forbiddenField];
  });

  return input;
}
