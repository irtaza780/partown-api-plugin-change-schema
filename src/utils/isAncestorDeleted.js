/**
 * @method isAncestorDeleted
 * @summary Verify there are no deleted ancestors
 * Variants cannot be created / restored if their parent unit / variant is deleted
 * @param {Object} context - an object containing the per-request state
 * @param  {Object} unit - the unit object to check for ancestors
 * @param  {Boolean} includeSelf include supplied unit
 * @returns {Boolean} true or false
 */
export default async function isAncestorDeleted(context, unit, includeSelf) {
  const { collections } = context;
  const { Units } = collections;

  const unitIds = [
    ...unit.ancestors, // Avoid mutations
  ];

  if (includeSelf) {
    unitIds.push(unit._id);
  }

  // Verify there are no deleted ancestors
  // Variants cannot be created / restored if their parent unit / variant is deleted
  const archivedCount = await Units.find({
    _id: { $in: unitIds },
    isDeleted: true,
  }).count();

  if (archivedCount > 0) {
    return true;
  }

  return false;
}
