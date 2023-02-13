/**
 * @function createHandle
 * @private
 * @description Recursive method which trying to find a new `handle`, given the
 * existing copies
 * @param {Object} context -  an object containing the per-request state
 * @param {String} unitHandle - unit `handle`
 * @param {String} unitId - current unit `_id`
 * @param {String} shopId - ID of the shop that owns the unit
 * @returns {String} handle - modified `handle`
 */
export default async function createHandle(
  context,
  unitHandle,
  unitId,
  shopId
) {
  let handle = unitHandle || "";

  // exception unit._id needed for cases when double triggering happens
  const handleCount = await context.collections.Units.find({
    handle,
    _id: {
      $nin: [unitId],
    },
    shopId,
  }).count();

  // current unit "copy" number
  let handleNumberSuffix = 0;
  // unit handle prefix
  let handleString = handle;
  // copySuffix "-copy-number" suffix of unit
  const copySuffix =
    handleString.match(/-copy-\d+$/) || handleString.match(/-copy$/);

  // if unit is a duplicate, we should take the copy number, and cut
  // the handle
  if (copySuffix) {
    // we can have two cases here: copy-number and just -copy. If there is
    // no numbers in copySuffix then we should put 1 in handleNumberSuffix
    handleNumberSuffix = +String(copySuffix).match(/\d+$/) || 1;
    // removing last numbers and last "-" if it presents
    handleString = handle.replace(/\d+$/, "").replace(/-$/, "");
  }

  // if we have more than one unit with the same handle, we should mark
  // it as "copy" or increment our unit handle if it contain numbers.
  if (handleCount > 0) {
    // if we have unit with name like "unit4", we should take care
    // about its uniqueness
    if (handleNumberSuffix > 0) {
      handle = `${handleString}-${handleNumberSuffix + handleCount}`;
    } else {
      // first copy will be "...-copy", second: "...-copy-2"
      handle = `${handleString}-copy${
        handleCount > 1 ? `-${handleCount}` : ""
      }`;
    }
  }

  // we should check again if there are any new matches with DB
  // exception unit._id needed for cases then double triggering happens
  const existingUnitWithSameSlug = await context.collections.Units.findOne(
    {
      handle,
      _id: {
        $nin: [unitId],
      },
      shopId,
    },
    {
      projection: {
        _id: 1,
      },
    }
  );

  if (existingUnitWithSameSlug) {
    handle = createHandle(context, handle, unitId, shopId);
  }

  return handle;
}
