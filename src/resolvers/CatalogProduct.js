import getUserByUserId from "../utils/getUser.js";

import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";

import encodeOpaqueId from "@reactioncommerce/api-utils/encodeOpaqueId.js";

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
  async viewerVote(parent, args, context, info) {
    const { userId, collections } = context;
    const { Catalog, Votes } = collections;
    const { productId } = parent;
    const voteType = await Votes.findOne({ productId, userId });
    console.log("vote type is ", voteType);

    if (!voteType) {
      return "NONE";
    }
    if (voteType) {
      return voteType.voteType;
    }
  },

  async ownersList(parent, args, context, info) {
    const { Ownership } = context.collections;
    const result = await Ownership.find({
      productId: parent?.productId,
    }).toArray();

    return result?.map((item) => {
      return encodeOpaqueId("reaction/account", item?.ownerId);
    });
  },
  async buyerFee(parent, args, context, info) {
    const { ProductRate } = context.collections;
    let productType = parent.propertySaleType.type;
    let { buyerFee } = await ProductRate.findOne({
      productType,
    });
    return buyerFee;
  },
  async sellerFee(parent, args, context, info) {
    const { ProductRate } = context.collections;
    let productType = parent.propertySaleType.type;
    let { sellerFee } = await ProductRate.findOne({
      productType,
    });
    return sellerFee;
  },
  async remainingQuantity(parent, args, context, info) {
    const { collections, userId } = context;
    const productId = decodeOpaqueId(parent?._id).id;

    const { Trades, Catalog } = collections;
    const { product } = await Catalog.findOne({
      "product._id": productId,
    });

    let matchStage = {
      productId: productId,
      tradeType: "offer",
      completionStatus: { $ne: "completed" },
      isCancelled: { $ne: true },
    };

    // if (userId) {
    //   matchStage.sellerId = { $ne: userId };
    // }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$productId",
          totalUnits: { $sum: "$area" },
          totalOriginal: { $sum: "$originalQuantity" },
        },
      },
    ];

    const sum = await Trades.aggregate(pipeline).toArray();

    if (sum.length === 0) {
      return 0;
    }

    const percentage = (
      (sum[0]?.totalUnits / product?.area?.value) *
      100
    ).toFixed(2);

    await Catalog.updateOne(
      {
        "product._id": productId,
      },
      {
        $set: { remainingQuantity: parseFloat(percentage) },
      }
    );

    return percentage;
  },

  // async remainingQuantity(parent, args, context, info) {
  //   const { Catalog } = context.collections;
  //   console.log("parent is ", parent);
  //   const product = await Catalog.findOne({
  //     "product._id": parent._id,
  //   });

  //   console.log("product from remaning quantity resolver", product);

  //   return product ? product?.product?.remainingQuantity : 0;
  // },
};
