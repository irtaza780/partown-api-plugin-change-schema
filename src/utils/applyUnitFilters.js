import SimpleSchema from "simpl-schema";

const filters = new SimpleSchema({
  unitIds: {
    type: Array,
    optional: true,
  },
  "unitIds.$": String,
  shopIds: {
    type: Array,
    optional: true,
  },
  "shopIds.$": String,
  tagIds: {
    type: Array,
    optional: true,
  },
  "tagIds.$": String,
  query: {
    type: String,
    optional: true,
  },
  isArchived: {
    type: Boolean,
    optional: true,
  },
  isVisible: {
    type: Boolean,
    optional: true,
  },
  metafieldKey: {
    type: String,
    optional: true,
  },
  metafieldValue: {
    type: String,
    optional: true,
  },
  priceMin: {
    type: Number,
    optional: true,
  },
  priceMax: {
    type: Number,
    optional: true,
  },
});

/**
 * @name applyUnitFilters
 * @summary Builds a selector for Units collection, given a set of filters
 * @private
 * @param {Object} context - an object containing the per-request state
 * @param {Object} unitFilters - See filters schema above
 * @returns {Object} Selector
 */
export default function applyUnitFilters(context, unitFilters) {
  // if there are filter/params that don't match the schema
  filters.validate(unitFilters);

  // Init default selector - Everyone can see units that fit this selector
  let selector = {
    ancestors: [], // Lookup top-level units
    isDeleted: { $ne: true }, // by default, we don't publish deleted units
  };

  if (unitFilters) {
    // filter by unitIds
    if (unitFilters.unitIds) {
      selector = {
        ...selector,
        _id: {
          $in: unitFilters.unitIds,
        },
      };
    }

    if (unitFilters.shopIds) {
      selector = {
        ...selector,
        shopId: {
          $in: unitFilters.shopIds,
        },
      };
    }

    // filter by tags
    if (unitFilters.tagIds) {
      selector = {
        ...selector,
        hashtags: {
          $in: unitFilters.tagIds,
        },
      };
    }

    // filter by query
    if (unitFilters.query) {
      const cond = {
        $regex: unitFilters.query,
        $options: "i",
      };
      selector = {
        ...selector,
        $or: [
          {
            title: cond,
          },
          {
            pageTitle: cond,
          },
          {
            description: cond,
          },
        ],
      };
    }

    // filter by details
    if (unitFilters.metafieldKey && unitFilters.metafieldValue) {
      selector = {
        ...selector,
        metafields: {
          $elemMatch: {
            key: {
              $regex: unitFilters.metafieldKey,
              $options: "i",
            },
            value: {
              $regex: unitFilters.metafieldValue,
              $options: "i",
            },
          },
        },
      };
    }

    // filter by visibility
    if (unitFilters.isVisible !== undefined) {
      selector = {
        ...selector,
        isVisible: unitFilters.isVisible,
      };
    }

    // filter by archived
    if (unitFilters.isArchived !== undefined) {
      selector = {
        ...selector,
        isDeleted: unitFilters.isArchived,
      };
    }

    // filter by gte minimum price
    if (unitFilters.priceMin && !unitFilters.priceMax) {
      selector = {
        ...selector,
        "price.min": {
          $gte: parseFloat(unitFilters.priceMin),
        },
      };
    }

    // filter by lte maximum price
    if (unitFilters.priceMax && !unitFilters.priceMin) {
      selector = {
        ...selector,
        "price.max": {
          $lte: parseFloat(unitFilters.priceMax),
        },
      };
    }

    // filter with a price range
    if (unitFilters.priceMin && unitFilters.priceMax) {
      const priceMin = parseFloat(unitFilters.priceMin);
      const priceMax = parseFloat(unitFilters.priceMax);

      // Filters a whose min and max price range are within the
      // range supplied from the filter
      selector = {
        ...selector,
        "price.min": {
          $gte: priceMin,
        },
        "price.max": {
          $lte: priceMax,
        },
      };
    }
  } // end if unitFilters

  return selector;
}
