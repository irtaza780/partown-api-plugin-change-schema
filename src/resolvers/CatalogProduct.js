import getUserByUserId from "../utils/getUser.js";

import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";

export default {
  async managerInfo(parent, args, context, info) {
    console.log("parent is", parent);
    let managerDetails = await getUserByUserId(
      context,
      decodeOpaqueId(parent.manager)?.id
    );

    return managerDetails;
  },
};
