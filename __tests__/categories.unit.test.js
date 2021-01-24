const api = require('../lib/api');

const {
  createCategory,
  editCategory,
  deleteCategory,
  fetchCategories
} = require('../lib/categories');

const { category } = require('../lib/sql');

const db = {
  none: jest.fn(),
  any: jest.fn(),
  manyOrNone: jest.fn(),
  one: jest.fn()
};

const successResponse = {
  status: 'success',
  statusCode: 200
};

