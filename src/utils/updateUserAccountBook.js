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
function create_UUID() {
  var dt = new Date().getTime();
  var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      var r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    }
  );
  return uuid;
}
export default async function updateUserAccountBook(context, args) {
  const {
    AccountId,
    AccountTitle,
    swiftCode,
    AccountNo,
    isActive,
    AccountBookId,
  } = args;
  const { collections } = context;
  const { Accounts } = collections;
  let accountupdate = null;
  let accountupdateObj = null;
  let accountExist = await Accounts.findOne({ _id: AccountId });
  if (accountExist) {
    if (AccountBookId) {
      let AccountBookIdExist = await Accounts.findOne({
        _id: AccountId,
        "profile.accountBook._id": AccountBookId,
      });

      if (!AccountBookIdExist) {
        console.log("AccountBookIdExist does not exist");
        throw new Error("Somehting went wrong");
      }
      let accountObj = {
        _id: AccountBookId,

        AccountTitle: AccountTitle,
        swiftCode: swiftCode,
        AccountNo: AccountNo,
        isActive: isActive,
        dateUpdated: new Date().toISOString(),
      };
      accountupdate = await Accounts.findOneAndUpdate(
        { _id: AccountId, "profile.accountBook._id": AccountBookId },
        {
          $set: {
            "profile.accountBook.$": accountObj,
          },
        }
      );
      accountupdateObj = accountObj
    } else {
      let accountObj = {
        _id: create_UUID(),
        AccountTitle: AccountTitle,
        swiftCode: swiftCode,
        AccountNo: AccountNo,
        isActive: isActive,
        dateUpdated: new Date().toISOString(),
        dateCreated: new Date().toISOString(),
      };
      accountupdate = await Accounts.findOneAndUpdate(
        { _id: AccountId },
        {
          $push: {
            "profile.accountBook": accountObj,
          },
        }
      );
      accountupdateObj = accountObj;
    }
  } else {
    console.log("account does not exist");
    throw new Error("Somehting went wrong");
  }

  return accountupdateObj;
}
