import pkg from "../package.json";
import cors from "cors";
import bodyParser from "body-parser";
import SimpleSchema from "simpl-schema";
import importAsString from "@reactioncommerce/api-utils/importAsString.js";
const mySchema = importAsString("./schema.graphql");
import getOrdersByUserId from "./utils/getOrders.js";
import getVariantsByUserId from "./utils/getVariants.js";
import getUserByUserId from "./utils/getUser.js";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
import updateUserAccountBook from "./utils/updateUserAccountBook.js";
import updateUserFulfillmentMethod from "./utils/updateUserFulfillmentMethod.js";

import encodeOpaqueId from "@reactioncommerce/api-utils/encodeOpaqueId.js";
var _context = null;
const resolvers = {
  Query: {},
  Mutation: {
    async purchaseProperty(parent, args, context, info){
      try {
        console.log("see context", context.user, context.userId)
        // let { Products, Catalog } = context.collections;
        // let { productId } = args;
        // let _id = decodeOpaqueId(productId)?.id;
        // console.log("productId", _id)
        // Catalog.updateOne(
        //     { _id },
        //     { $set: { currentOwner: "partOwn" } }
        //   )
        
        return {
          success: true
        }
      } catch(err) {
        console.log("Error", err);
        return {
          success: false,
          message: "Server Error.",
          status: 500
        }
      }
    },
    async updateAccountpayBookEntry(parent, args, context, info) {
      let updateResponse = await updateUserAccountBook(context, args.input);
      return updateResponse;
    },
    async updateAvailableFulfillmentMethodEntry(parent, args, context, info) {
      let updateResponse = await updateUserFulfillmentMethod(context, args.input);
      let reaction_response=updateResponse.length>0?updateResponse.map(id=>{ return encodeOpaqueIdFunction("reaction/fulfillmentMethod",id)}):[]
      return reaction_response;
    },
    async deleteAccount(parent, args, context, info) {
      try {
        let { userId } = args;
        let {  Products, Accounts, users, Bids, Catalog } = context.collections;
        console.log("userId", userId)
        let deletedBids = await Bids.remove({$or: [ { soldBy:  userId }, { createdBy: userId } ]});
        let deletedCatalog = await Catalog.remove({ "product.uploadedBy.userId": userId });
        let deletedProducts = await Products.remove({ "uploadedBy.userId": userId });
        let deletedUser = await users.remove({ _id: userId });
        let deletedAccount = await Accounts.remove({ userId })
        console.log("deletedBids", deletedBids, deletedCatalog, deletedProducts, deletedUser, deletedAccount);
        if( deletedUser?.deletedCount > 0 || deletedAccount?.deletedCount > 0 )
          return {
            success: true,
            message: "deleted successfully.",
            status: 200
          }
        else
          return {
            success: false,
            message: "please refresh again!",
            status: 200
          } 
      } catch(err){
        console.log("error", err)
        return {
          success: false,
          message: "Server Error.",
          status: 500
        }
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
        if( updatedPassword?.result?.nModified > 0 )
          return {
            success: true,
            message: "updated successfully.",
            status: 200
          }
        else
          return {
            success: false,
            message: "please refresh again!",
            status: 200
          } 
      } catch(err){
        console.log("error", err)
        return {
          success: false,
          message: "Server Error.",
          status: 500
        }
      }
    },
    async addProductVieworCart(parent, args, context, info) {
      try {
        let { Products } = context.collections;
        let { productId, flag } = args.input;
        let _id = decodeOpaqueId(productId)?.id;
        console.log("productId", _id)
        if( flag === "cart" ) {
          Products.updateOne(
            { _id },
            { $inc: { totalCarts: 1 } }
          )
        } else {
          Products.updateOne(
            { _id },
            { $inc: { productViews: 1 } }
          )
        }
        return {
          success: true,
          message: "Successfull.",
          status: 200
        }
      } catch(err) {
        console.log("Error", err);
        return {
          success: false,
          message: "Server Error.",
          status: 500
        }
      }
    }
  },
};
function encodeOpaqueIdFunction(source,id){
  return encodeOpaqueId(source, id)
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
      type: String
    },
    landValue: {
      type: String
    },
    developmentValue: {
      type: String
    },
    agency: {
      type: String
    },
    legal: {
      type: String
    },
    totalCost: {
      type: String
    },
    unitPrice: {
      type: String
    }
  })
  const priceHistory = new SimpleSchema ({
    price: {
      type: String
    },
    date: {
      type: String
    }
  })
  const propertySaleType = new SimpleSchema({
    type: {
      type: String
    }
  })
  const previousOwners = new SimpleSchema({
    userId: {
      type: String
    },
    userName: {
      type: String
    }
  })
  const location = new SimpleSchema({
    country: {
      type: String
    },
    state: {
      type: String
    },
    location: {
      type: String
    }
  })

  const area = new SimpleSchema({
    unit: {
      type: String
    },
    price: {
      type: Number
    },
    value: {
      type: Number
    }
  })
  const documents = new SimpleSchema({
    url: {
      type: String
    }
  })
  const currentOwner = new SimpleSchema({
    userId: {
      type: String
    },
    userName: {
      type: String
    }
  })
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
      type: String
    },
    previousOwners: [previousOwners],
    currentOwner: currentOwner,
    investmentDetails: investmentDetails,
    propertySaleType: propertySaleType,
    location: location,
    documents: [documents],
    area: area
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
      type: String
    },
    previousOwners: [previousOwners],
    currentOwner: currentOwner,
    investmentDetails: investmentDetails,
    propertySaleType: propertySaleType,
    location: location,
    documents: [documents],
    area: area
  });
  }
// The new myPublishProductToCatalog function parses our products,
// gets the new uploadedBy attribute, and adds it to the corresposellernding catalog variant in preparation for publishing it to the catalog
function myPublishProductToCatalog(
  catalogProduct,
  { context, product, shop, variants }
) {
  let { collections } = context;
  console.log("cataLogProduct", catalogProduct)
  // console.log("check product", catalogProduct, product, collections)
  // catalogProduct.uploadedBy = product.uploadedBy || null;
  // catalogProduct.upVotes = product.upVotes || 0;
  catalogProduct.currentOwner = product.currentOwner ?? "partOwn";
  catalogProduct.propertyType = product.propertyType || "not specifiend";
  catalogProduct.documents = product?.documents
  catalogProduct.previousOwners = product.previousOwners ?? [];
  catalogProduct.investmentDetails = product.investmentDetails ?? null;
  catalogProduct.area = product?.area
  catalogProduct.propertySaleType = product.propertySaleType ?? "presale"
  catalogProduct.location = product.location ?? null;
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
