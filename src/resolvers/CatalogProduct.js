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
    let { collections, userId, authToken } = context;
    const productId = parent?._id;
    let decodedProductId = decodeOpaqueId(productId).id;

    let { Trades, Catalog } = collections;
    let { product } = await Catalog.findOne({
      "product._id": decodedProductId,
    });
    let sum = [];
    if (!userId) {
      sum = await Trades.aggregate([
        {
          $match: {
            productId: decodedProductId,
            tradeType: "offer",
            completionStatus: { $ne: "completed" },
            isCancelled: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$productId",
            totalUnits: { $sum: "$area" },
            totalOriginal: { $sum: "$originalQuantity" },
          },
        },
      ]).toArray();
    } else {
      sum = await Trades.aggregate([
        {
          $match: {
            productId: decodedProductId,
            tradeType: "offer",
          },
        },
        {
          $match: {
            sellerId: { $ne: userId },
            completionStatus: { $ne: "completed" },
            isCancelled: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$productId",
            totalUnits: { $sum: "$area" },
            totalOriginal: { $sum: "$originalQuantity" },
          },
        },
      ]).toArray();
    }

    if (sum.length === 0) {
      return 0;
    }

    let percentage = (
      (sum[0]?.totalUnits / product?.area?.value) *
      100
    ).toFixed(2);

    return percentage;
  },
};
