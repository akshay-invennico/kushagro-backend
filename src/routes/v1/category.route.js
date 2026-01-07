const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const categoryValidation = require('../../validations/category.validation');
const categoryController = require('../../controllers/category.controller');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(categoryValidation.createCategory), categoryController.createCategory)
  .get(categoryController.getCategories);

router
  .route('/:categoryId')
  .get(auth(), categoryController.getCategory)
  .patch(auth(), validate(categoryValidation.updateCategory), categoryController.updateCategory);

module.exports = router;
