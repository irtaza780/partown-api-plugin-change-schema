/**
 *
 * @method getVariants
 * @summary Get all of a Unit's Variants or only a Unit's top level Variants.
 * @param {Object} context - an object containing the per-request state
 * @param {String} unitOrVariantId - A Unit or top level Unit Variant ID.
 * @param {Boolean} topOnly - True to return only a units top level variants.
 * @param {Object} args - an object of all arguments that were sent by the client
 * @param {Boolean} args.shouldIncludeHidden - Include hidden units in results
 * @param {Boolean} args.shouldIncludeArchived - Include archived units in results
 * @returns {Promise<Object[]>} Array of Unit Variant objects.
 */
export default async function getOrdersByUserId(
  context,
  ownerId,
  topOnly,
  args
) {
  const { shouldIncludeHidden, shouldIncludeArchived } = args;
  const { collections } = context;
  const { Orders } = collections;

  // const selector = {
  //   "uploadedBy.userId":ownerId,
  //   type: "variant",
  // };


  return Orders.aggregate( [ {
    $lookup: {
        from: "Products",
        localField: "shipping.items.0.variantId",
        foreignField: "_id",
        as: "productOrdered"
    }
},{$match:
{'productOrdered.uploadedBy.userId': ownerId}}] ).toArray();
}
