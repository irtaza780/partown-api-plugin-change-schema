/**
 * @function createTitle
 * @private
 * @description Recursive method which trying to find a new `title`, given the
 * existing copies
 * @param {Object} context -  an object containing the per-request state
 * @param {String} newTitle - unit `title`
 * @param {String} unitId - current unit `_id`
 * @returns {String} title - modified `title`
 */
export default async function createTitle(context, newTitle, unitId) {
  // exception unit._id needed for cases then double triggering happens
  let title = newTitle || "";
  const titleCount = await context.collections.Units.find({
    title,
    _id: {
      $nin: [unitId],
    },
  }).count();
  // current unit "copy" number
  let titleNumberSuffix = 0;
  // unit handle prefix
  let titleString = title;
  // copySuffix "-copy-number" suffix of unit
  const copySuffix =
    titleString.match(/-copy-\d+$/) || titleString.match(/-copy$/);
  // if unit is a duplicate, we should take the copy number, and cut
  // the handle
  if (copySuffix) {
    // we can have two cases here: copy-number and just -copy. If there is
    // no numbers in copySuffix then we should put 1 in handleNumberSuffix
    titleNumberSuffix = +String(copySuffix).match(/\d+$/) || 1;
    // removing last numbers and last "-" if it presents
    titleString = title.replace(/\d+$/, "").replace(/-$/, "");
  }

  // if we have more than one unit with the same handle, we should mark
  // it as "copy" or increment our unit handle if it contain numbers.
  if (titleCount > 0) {
    // if we have unit with name like "unit4", we should take care
    // about its uniqueness
    if (titleNumberSuffix > 0) {
      title = `${titleString}-${titleNumberSuffix + titleCount}`;
    } else {
      // first copy will be "...-copy", second: "...-copy-2"
      title = `${titleString}-copy${titleCount > 1 ? `-${titleCount}` : ""}`;
    }
  }

  // we should check again if there are any new matches with DB
  if (
    (await context.collections.Units.find({
      title,
    }).count()) !== 0
  ) {
    title = createTitle(context, title, unitId);
  }
  return title;
}
