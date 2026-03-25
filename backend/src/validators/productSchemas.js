import Joi from "joi";

// ✅ Create Product
export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  short_description: Joi.string().max(300).allow(""),
  description: Joi.string().max(2000).required(),
  specs: Joi.alternatives()
    .try(
      Joi.string().allow(""),
      Joi.object().pattern(Joi.string(), Joi.string().allow(""))
    )
    .optional(),
  price: Joi.number().positive().required(),
  countInStock: Joi.number().integer().min(0).required(),
  category: Joi.string().required(),
  brand: Joi.string().allow("", null),
  image_url: Joi.string().allow("").optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  imageUrls: Joi.string().allow("").optional(),
  homeSections: Joi.alternatives().try(
    Joi.string().allow(""),
    Joi.array().items(Joi.string())
  ).optional(),
});

// ✅ Update Product (same as create but all optional)
export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  short_description: Joi.string().max(300).allow(""),
  description: Joi.string().max(2000),
  specs: Joi.alternatives()
    .try(
      Joi.string().allow(""),
      Joi.object().pattern(Joi.string(), Joi.string().allow(""))
    )
    .optional(),
  price: Joi.number().positive(),
  countInStock: Joi.number().integer().min(0),
  category: Joi.string(),
  brand: Joi.string().allow("", null),
  image_url: Joi.string().allow("").optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  existingImages: Joi.alternatives().try(
    Joi.string().allow(""),
    Joi.array().items(Joi.string())
  ).optional(),
  imageUrls: Joi.string().allow("").optional(),
  homeSections: Joi.alternatives().try(
    Joi.string().allow(""),
    Joi.array().items(Joi.string())
  ).optional(),
});

// ✅ Review
export const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  title: Joi.string().min(2).max(150).required(),
  comment: Joi.string().max(1000).required(),
  image_url: Joi.string().allow(""),
});


