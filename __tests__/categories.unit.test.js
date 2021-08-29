jest.mock('../lib/api');
const api = require('../lib/api');
const {
  createCategory,
  editCategory,
  deleteCategory,
  fetchCategories
} = require('../lib/categories');

const { category } = require('../lib/sql');

jest.useFakeTimers();

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

describe("Categories", () => {
  test("createCategory function works correctly", async () => {
    let payload = {
      "name": "Marketing"
    };

    let response = {
      "id": 1,
      ...payload
    };

    db.one.mockImplementationOnce(()=>{
      return Promise.resolve(response);
    });

    api.createSuccessResponse.mockReturnValue({
      ...successResponse,
      data: {
        category: response
      }
    });

    let result = await createCategory(payload, 1, db, category.create_category);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.one).toHaveBeenCalledTimes(1);
    expect(db.one.mock.calls[0][0]).toEqual(category.create_category);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data.category).toEqual(response);
    jest.clearAllMocks();
  });


  test("editCategory function works correctly", async () => {
    let payload = {
      "name": "Marketing"
    };

    let response = {
      "id": 1,
      ...payload
    };

    db.one.mockImplementationOnce(()=>{
      return Promise.resolve(response);
    });

    api.createSuccessResponse.mockReturnValue({
      ...successResponse,
      data: {
        category: response
      }
    });

    let result = await editCategory(payload, 1, 1, db, category.edit_category);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.one).toHaveBeenCalledTimes(1);
    expect(db.one.mock.calls[0][0]).toEqual(category.edit_category);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data.category).toEqual(response);
    jest.clearAllMocks();
  });

  test("fetchCategories function works correctly", async () => {
    let payload = {
      "name": "Marketing"
    };

    let response = {
      "id": 1,
      ...payload
    };

    db.manyOrNone.mockImplementationOnce(()=>{
      return Promise.resolve([response]);
    });

    api.createSuccessResponse.mockReturnValue({
      ...successResponse,
      data: {
        categories: [response]
      }
    });

    let result = await fetchCategories(1, db, category.fetch_categories);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.manyOrNone).toHaveBeenCalledTimes(1);
    expect(db.manyOrNone.mock.calls[0][0]).toEqual(category.fetch_categories);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data.categories).toEqual([response]);
    jest.clearAllMocks();
  });

  test("deleteCategory function works correctly", async () => {
    db.any.mockImplementationOnce(()=>{
      return Promise.resolve();
    });

    api.createSuccessResponse.mockReturnValue({
      ...successResponse,
      data: null
    });
    let result = await deleteCategory(1, 1, db, category.delete_category);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.any).toHaveBeenCalledTimes(1);
    expect(db.any.mock.calls[0][0]).toEqual(category.delete_category);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data).toEqual(null);
    jest.clearAllMocks();
  });

});
