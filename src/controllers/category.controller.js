const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const categoryService = require('../services/category.service');

const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);

  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'Category created successfully',
    data: category,
  });
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.categoryId, req.body);

  res.send({
    success: true,
    message: 'Category updated successfully',
    data: category,
  });
});

const getCategory = catchAsync(async (req, res) => {
  const data = await categoryService.getCategoryWithFields(req.params.categoryId);

  res.send({
    success: true,
    message: 'Category fetched successfully',
    data,
  });
});

const getCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.getAllCategories();

  res.send({
    success: true,
    data: categories,
  });
});

const deleteCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategory(req.params.categoryId);
  res.send({
    success: true,
    message: 'Category deleted successfully',
  });
});

const updateCategoryStatus = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategoryStatus(req.params.categoryId, req.body.status);
  res.send({
    success: true,
    message: 'Category status updated successfully',
    data: category,
  });
});

module.exports = {
  createCategory,
  updateCategory,
  getCategory,
  getCategories,
  deleteCategory,
  updateCategoryStatus,
};
