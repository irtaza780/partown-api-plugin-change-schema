import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
export default {
  async addedByInfo(parent, args, context, info) {
    const { Accounts } = context.collections;
    console.log("added by account id is ", parent.addedBy);

    let decodedId = decodeOpaqueId(parent?.addedBy).id;

    const account = await Accounts.findOne({ _id: decodedId });

    console.log("added by info is ", account);

    return account;
  },
};
