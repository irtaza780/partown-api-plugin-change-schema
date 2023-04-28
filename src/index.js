import pkg from "../package.json";
import cors from "cors";
import bodyParser from "body-parser";
import SimpleSchema from "simpl-schema";
import axios from "axios";
import importAsString from "@reactioncommerce/api-utils/importAsString.js";
const mySchema = importAsString("./schema.graphql");
import getOrdersByUserId from "./utils/getOrders.js";
import getVariantsByUserId from "./utils/getVariants.js";
import getUserByUserId from "./utils/getUser.js";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
import updateUserAccountBook from "./utils/updateUserAccountBook.js";
import updateUserFulfillmentMethod from "./utils/updateUserFulfillmentMethod.js";
import CatalogProduct from "./resolvers/CatalogProduct.js";
import ReactionError from "@reactioncommerce/reaction-error";

import encodeOpaqueId from "@reactioncommerce/api-utils/encodeOpaqueId.js";
var _context = null;
const resolvers = {
  CatalogProduct,
  Query: {
    async getMyProperties(parent, args, context, info) {
      try {
        let { Products } = context.collections;
        let { user } = context;
        let { pageNo, perPage, propertyFilters, sortBy, sortOrder } =
          args.input;
        if (user) {
          console.log("input", args.input);
          const query = {
            "currentOwner.userId": user.id,
            isVisible: true,
          };
          if (propertyFilters) {
            console.log("if statement", propertyFilters);
            const { state, propertyType, propertySaleType } = propertyFilters;
            if (state?.length) query["location.state"] = { $in: state };
            if (propertySaleType)
              query["propertySaleType.type"] = propertySaleType;
            if (propertyType) query["propertyType"] = propertyType;
          } else if (!propertyFilters?.propertySaleType) {
            console.log("else statement", propertyFilters);
            query["propertySaleType.type"] = "sold";
          }
          // let myProperties = await Products.find({
          //   "currentOwner.userId": user.id
          // })
          // .skip( pageNo > 0 ? ( ( pageNo - 1 ) * perPage ) : 0 )
          // .limit( perPage )
          // .toArray()

          const sortByInfo = {};
          if (sortBy) {
            if (sortBy === "propertyUnits") {
              sortByInfo["area.value"] = sortOrder === "asc" ? 1 : -1;
              // todo
            } else if (sortBy === "propertyPrice") {
              // todo
              sortByInfo["area.price"] = sortOrder === "asc" ? 1 : -1;
            }
          } else {
            // todo
            sortByInfo["createdAt"] = sortOrder === "asc" ? 1 : -1;
          }
          console.log("here is the query", query, sortByInfo);
          let myProperties = await Products.find(query)
            .sort(sortByInfo)
            .skip(pageNo > 0 ? (pageNo - 1) * perPage : 0)
            .limit(perPage)
            .toArray();
          console.log("Products", myProperties);
          return {
            properties: myProperties,
            success: true,
            status: 200,
          };
        } else {
          return {
            success: false,
            message: `unAuthorized.`,
            status: 400,
          };
        }
      } catch (err) {
        console.log("Error", err);
        return {
          success: false,
          message: `Server Error ${err}.`,
          status: 500,
        };
      }
    },
  },
  Mutation: {
    async purchaseProperty(parent, args, context, info) {
      try {
        if (context.user) {
          console.log(
            "see context",
            context.authToken,
            context.user,
            context.userId
          );
          const currentOwner = {
            userId: context.userId,
            userName: context?.user?.username ?? "null",
          };
          let { Products, Catalog, Accounts } = context.collections;
          // let userWallet = await Accounts.findOne({ userId: context.userId })
          // if(userWallet?.wallets?.amount > productInfo?.area?.price ){
          //   // todo
          // } else {
          //   return {
          //     success: false,
          //     status: 200,
          //     message: "Don't have enough balance."
          //   }
          // }
          let { productId } = args;
          let _id = decodeOpaqueId(productId)?.id;
          let productInfo = await Products.find({ _id }).toArray();
          console.log("productId", _id, productInfo);
          let updateProduct = await Products.updateOne(
            { _id },
            {
              $set: {
                currentOwner: currentOwner,
                "propertySaleType.type": "sold",
              },
              $push: {
                previousOwners: currentOwner,
              },
            }
          );
          var data = JSON.stringify({
            query: `mutation {
            publishProductsToCatalog(productIds: ["${productId}"]){
              product{
                title
                propertyType
              }
            }
          }`,
            variables: {},
          });

          var config = {
            method: "post",
            url: "http://localhost:3000/graphql",
            headers: {
              Authorization: `Bearer ${context.authToken}`,
              "Content-Type": "application/json",
            },
            data: data,
          };

          let response = await axios(config);
          console.log("responses", response.data, updateProduct);
          await Accounts.updateOne(
            { userId: context.userId },
            {
              $inc: { "wallets.amount": -productInfo[0]?.area?.price },
              // $set: { "wallets.currency": wallet.currency }
            }
          );

          return {
            success: true,
            status: 200,
            message: "property bought.",
          };
        } else {
          return {
            success: false,
            message: `unAuthorized.`,
            status: 401,
          };
        }
      } catch (err) {
        console.log("Error", err);
        return {
          success: false,
          message: `Server Error ${err}.`,
          status: 500,
        };
      }
    },
    async updateAccountpayBookEntry(parent, args, context, info) {
      let updateResponse = await updateUserAccountBook(context, args.input);
      return updateResponse;
    },
    async updateAvailableFulfillmentMethodEntry(parent, args, context, info) {
      let updateResponse = await updateUserFulfillmentMethod(
        context,
        args.input
      );
      let reaction_response =
        updateResponse.length > 0
          ? updateResponse.map((id) => {
              return encodeOpaqueIdFunction("reaction/fulfillmentMethod", id);
            })
          : [];
      return reaction_response;
    },
    async deleteAccount(parent, { accountId }, context, info) {
      try {
        const { collections, userId, authToken } = context;
        let { Products, Accounts, users, Trades, Catalog, Transactions } =
          collections;

        if (!authToken || !userId)
          throw new ReactionError("access-denied", "Access denied");

        if (
          decodeOpaqueId(accountId).id ===
          decodeOpaqueId(process.env.ADMIN_ID).id
        )
          return new Error("Cannot Delete Admin ");

        await context.validatePermissions(`reaction:legacy:accounts`, "create");

        const decodedUserId = decodeOpaqueId(accountId).id;
        let deletedTransactions = await Transactions.remove({
          transactionBy: decodedUserId,
        });
        let deletedTrades = await Trades.remove({
          createdBy: decodedUserId,
        });

        let deletedCatalog = await Catalog.remove({
          "product.uploadedBy.userId": decodedUserId,
        });
        let deletedProducts = await Products.remove({
          "uploadedBy.userId": decodedUserId,
        });
        let deletedUser = await users.remove({ _id: decodedUserId });
        let deletedAccount = await Accounts.remove({ userId: decodedUserId });
        console.log("deleted account ", deletedAccount);
        console.log("deleted User", deletedUser);
        return deletedAccount?.result?.n > 0 || deletedUser?.result?.n > 0;
      } catch (err) {
        return err;
      }
    },
    async updateUserPassword(parent, args, context, info) {
      try {
        let { email, password } = args.input;
        let { users } = context.collections;
        console.log("email, password", email, password);
        let updatedPassword = await users.updateOne(
          { "emails.address": email },
          { $set: { "services.password.bcrypt": password } }
        );
        console.log("updatedPassword", updatedPassword);
        if (updatedPassword?.result?.nModified > 0)
          return {
            success: true,
            message: "updated successfully.",
            status: 200,
          };
        else
          return {
            success: false,
            message: "please refresh again!",
            status: 200,
          };
      } catch (err) {
        console.log("error", err);
        return {
          success: false,
          message: "Server Error.",
          status: 500,
        };
      }
    },
    async addProductVieworCart(parent, args, context, info) {
      try {
        let { Products } = context.collections;
        let { productId, flag } = args.input;
        let _id = decodeOpaqueId(productId)?.id;
        console.log("productId", _id);
        if (flag === "cart") {
          Products.updateOne({ _id }, { $inc: { totalCarts: 1 } });
        } else {
          Products.updateOne({ _id }, { $inc: { productViews: 1 } });
        }
        return {
          success: true,
          message: "Successfull.",
          status: 200,
        };
      } catch (err) {
        console.log("Error", err);
        return {
          success: false,
          message: "Server Error.",
          status: 500,
        };
      }
    },
  },
};
function encodeOpaqueIdFunction(source, id) {
  return encodeOpaqueId(source, id);
}
function myStartup1(context) {
  _context = context;
  const { app, collections, rootUrl } = context;
  const OwnerInfo = new SimpleSchema({
    userId: {
      type: String,
      max: 30,
      optional: true,
    },
    image: {
      type: String,
      max: 20,
      optional: true,
    },
    name: {
      type: String,
      optional: true,
    },
  });
  const investmentDetails = new SimpleSchema({
    description: {
      type: String,
    },
    landValue: {
      type: String,
    },
    developmentValue: {
      type: String,
    },
    agency: {
      type: String,
    },
    legal: {
      type: String,
    },
    totalCost: {
      type: String,
    },
    unitPrice: {
      type: String,
    },
  });
  const priceHistory = new SimpleSchema({
    price: {
      type: Number,
    },
    date: {
      type: Date,
    },
  });
  const propertySaleType = new SimpleSchema({
    type: {
      type: String,
    },
  });
  const previousOwners = new SimpleSchema({
    userId: {
      type: String,
      optional: true,
    },
    userName: {
      type: String,
      optional: true,
    },
  });
  const location = new SimpleSchema({
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    location: {
      type: String,
    },
  });

  const area = new SimpleSchema({
    unit: {
      type: String,
    },
    price: {
      type: Number,
    },
    value: {
      type: Number,
    },
    availableQuantity: {
      type: Number,
    },
  });

  const planMedia = new SimpleSchema({
    url: {
      type: String,
      optional: true,
    },
  });
  const documents = new SimpleSchema({
    url: {
      type: String,
    },
  });
  const financials = new SimpleSchema({
    title: {
      type: String,
    },
    value: {
      type: Number,
    },
  });
  const coordinates = new SimpleSchema({
    longitude: {
      type: String,
    },
    latitude: {
      type: String,
    },
  });
  const currentOwner = new SimpleSchema({
    userId: {
      type: String,
      optional: true,
    },
    userName: {
      type: String,
      optional: true,
    },
  });
  context.simpleSchemas.Product.extend({
    // uploadedBy: OwnerInfo,
    ancestorId: {
      type: String,
      optional: true,
    },
    parentId: {
      type: String,
      optional: true,
    },
    propertyType: {
      type: String,
    },
    previousOwners: [previousOwners],
    currentOwner: currentOwner,
    investmentDetails: investmentDetails,
    propertySaleType: propertySaleType,
    location: location,
    documents: [documents],
    financials: [financials],
    planMedia: [planMedia],
    coordinates: coordinates,
    area: area,
    priceHistory: [priceHistory],
    manager: String,
    upVotes: { type: Number, optional: true },
    yield: { type: Number, optional: true },
    downVotes: { type: Number, optional: true },
    activeStatus: Boolean,
  });
  context.simpleSchemas.CatalogProduct.extend({
    // uploadedBy: OwnerInfo,
    ancestorId: {
      type: String,
      optional: true,
    },
    parentId: {
      type: String,
      optional: true,
    },
    propertyType: {
      type: String,
    },
    previousOwners: [previousOwners],
    currentOwner: currentOwner,
    investmentDetails: investmentDetails,
    propertySaleType: propertySaleType,
    location: location,
    documents: [documents],
    financials: [financials],
    planMedia: [planMedia],
    coordinates: coordinates,
    activeStatus: Boolean,
    manager: String,
    upVotes: { type: Number, optional: true },
    downVotes: { type: Number, optional: true },
    yield: { type: Number, optional: true },
    area: area,
    priceHistory: [priceHistory],
  });
}
// The new myPublishProductToCatalog function parses our products,
// gets the new uploadedBy attribute, and adds it to the corresposellernding catalog variant in preparation for publishing it to the catalog
function myPublishProductToCatalog(
  catalogProduct,
  { context, product, shop, variants }
) {
  let { collections } = context;
  console.log("collections are");
  console.log(collections);

  console.log("catalog Product");
  console.log(catalogProduct);

  // console.log("check product", catalogProduct, product, collections)
  // catalogProduct.uploadedBy = product.uploadedBy || null;
  // catalogProduct.upVotes = product.upVotes || 0;
  catalogProduct.manager = product.manager ?? "";
  catalogProduct.upVotes = product.upVotes ?? 0;
  catalogProduct.yield = product.yield ?? 0;
  catalogProduct.downVotes = product.downVotes ?? 0;
  catalogProduct.currentOwner = product.currentOwner ?? "partOwn";
  catalogProduct.propertyType = product.propertyType || "not specifiend";
  catalogProduct.documents = product?.documents;
  catalogProduct.financials = product?.financials;
  catalogProduct.previousOwners = product.previousOwners ?? [];
  catalogProduct.investmentDetails = product.investmentDetails ?? null;
  catalogProduct.area = product?.area;
  catalogProduct.priceHistory = product?.priceHistory ?? [];
  catalogProduct.propertySaleType = product.propertySaleType ?? "presale";
  catalogProduct.location = product.location ?? null;
  catalogProduct.planMedia = product.planMedia ?? [];
  catalogProduct.coordinates = product.coordinates ?? {};
  catalogProduct.activeStatus = product.activeStatus ?? true;
  // catalogProduct.variants &&
  //   catalogProduct.variants.map((catalogVariant) => {
  //     const productVariant = variants.find(
  //       (variant) => variant._id === catalogVariant.variantId
  //     );
  //     catalogVariant.uploadedBy = productVariant.uploadedBy || null;
  //     catalogVariant.ancestorId = productVariant["ancestors"][0]
  //       ? productVariant["ancestors"][0]
  //       : null;
  //     // catalogVariant.parentId=productVariant["parentId"]?productVariant["parentId"]:null;
  //   });
}
/**
 * @summary Import and call this function to add this plugin to your API.
 * @param {ReactionAPI} app The ReactionAPI instance
 * @returns {undefined}
 */
export default async function register(app) {
  await app.registerPlugin({
    label: pkg.name,
    name: pkg.name,
    version: pkg.version,
    functionsByType: {
      startup: [myStartup1],
      publishProductToCatalog: [myPublishProductToCatalog],
    },
    graphQL: {
      schemas: [mySchema],
      resolvers,
    },
  });
}
