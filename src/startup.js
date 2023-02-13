function myStartup(context) {
    context.simpleSchemas.Product.extend({
      uploadedBy: {
        type: Number,
        min: 0,
        optional: true
      },
      upVotes: Number,
      productViews: Number,
      totalCarts: Number
    });
  
    context.simpleSchemas.CatalogProduct.extend({
      uploadedBy: {
        type: Number,
        min: 0,
        optional: true
      },
      upVotes: Number
    })
  }

  export {myStartup};