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
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";

export default async function updateUserFulfillmentMethod(context, args) {
  const { AccountId, FulfillmentMethodId, status } = args;
  console.log(AccountId, FulfillmentMethodId, status);
  const { collections } = context;
  const { Accounts } = collections;
  let accountupdate = null;
  let accountupdateObj = null;
  let accountExist = await Accounts.findOne({ _id: AccountId });

  if (accountExist) {
    if (FulfillmentMethodId && FulfillmentMethodId.trim().length > 0) {
      if(status){
      console.log("Adding fulfillment", decodeOpaqueId(FulfillmentMethodId));

      accountupdate = await Accounts.updateOne(
        { _id: AccountId },
        {
          $addToSet: {
            fulfillmentMethods: decodeOpaqueId(FulfillmentMethodId).id,
          },
        }
      );
    }
      else{
      console.log("removing fulfillment", decodeOpaqueId(FulfillmentMethodId));

        accountupdate = await Accounts.updateOne(
          { _id: AccountId },
          {
            $pull: {
              fulfillmentMethods: decodeOpaqueId(FulfillmentMethodId).id,
            },
          }
        );
      }
      
      accountupdateObj = accountExist = await Accounts.findOne({ _id: AccountId });
      return accountupdateObj.fulfillmentMethods;
    } else {
      console.log("FulfillmentMethodId");
      throw new Error("Invalid parameters");
    }
  } else {
    console.log("account does not exist");
    throw new Error("Invalid parameters");
  }
}
