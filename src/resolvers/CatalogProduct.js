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
  async upVotes(parent, args, context, info) {
    const { Votes } = context.collections;
    let result = await Votes.aggregate([
      { $match: { productId: parent?._id } },
      {
        $group: {
          _id: "$voteType",
          count: { $sum: 1 },
        },
      },
    ]).toArray();
    const upVotesCount =
      result.find((item) => item._id === "UPVOTE")?.count || 0;
    return upVotesCount;
  },
  async downVotes(parent, args, context, info) {
    const { Votes } = context.collections;
    let result = await Votes.aggregate([
      { $match: { productId: parent?._id } },
      {
        $group: {
          _id: "$voteType",
          count: { $sum: 1 },
        },
      },
    ]).toArray();
    const downVotesCount =
      result.find((item) => item._id === "DOWNVOTE")?.count || 0;
    return downVotesCount;
  },
};