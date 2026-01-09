const httpStatus = require('http-status');
const slugify = require('slugify');
const ApiError = require('../utils/ApiError');
const Category = require('../models/category.model');
const CategoryField = require('../models/categoryField.model');

const createCategory = async (body) => {
  const { name, status, fields = [] } = body;

  const slug = slugify(name, { lower: true });

  const existingCategory = await Category.findOne({ slug });
  if (existingCategory) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category already exists');
  }

  const category = await Category.create({
    name,
    slug,
    status,
  });

  if (fields.length) {
    const categoryFields = fields.map((field) => ({
      ...field,
      categoryId: category.id,
    }));

    await CategoryField.insertMany(categoryFields);
  }

  return category;
};

const updateCategory = async (categoryId, body) => {
  const { name, status, fields = [] } = body;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  if (name && name !== category.name) {
    category.name = name;
    category.slug = slugify(name, { lower: true });
  }

  if (status) {
    category.status = status;
  }

  await category.save();
  await CategoryField.deleteMany({ categoryId });

  if (fields.length) {
    const categoryFields = fields.map((field) => ({
      ...field,
      categoryId,
    }));

    await CategoryField.insertMany(categoryFields);
  }

  return category;
};

const getCategoryWithFields = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  const fields = await CategoryField.find({ categoryId }).sort({ displayOrder: 1 });

  return { category, fields };
};

const getAllCategories = async () => {
  return Category.find().sort({ createdAt: -1 });
};

const deleteCategory = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  await category.remove();
  await CategoryField.deleteMany({ categoryId });
  return category;
};

const updateCategoryStatus = async (categoryId, status) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  category.status = status;
  await category.save();
  return category;
};

module.exports = {
  createCategory,
  updateCategory,
  getCategoryWithFields,
  getAllCategories,
  deleteCategory,
  updateCategoryStatus,
};
