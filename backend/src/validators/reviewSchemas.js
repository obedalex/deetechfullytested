// backend/src/validators/reviewSchemas.js
import Joi from "joi";

export const addReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().min(2).max(150).required(),
  comment: Joi.string().min(3).max(1000).required(),
  image_url: Joi.string().allow(""),
});

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  title: Joi.string().min(2).max(150),
  comment: Joi.string().min(3).max(1000),
  image_url: Joi.string().allow(""),
}).min(1); // must include at least one field

export const moderateReviewSchema = Joi.object({
  approved: Joi.boolean().required(),
});


