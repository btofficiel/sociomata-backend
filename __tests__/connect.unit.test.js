jest.mock('../lib/api');
const api = require('../lib/api');
const {
  storeTwitterTokens,
  deleteTwitterTokens
} = require('../lib/connect');

const { twitterAuth } = require('../lib/sql');

const db = {
  none: jest.fn(),
  any: jest.fn(),
  manyOrNone: jest.fn(),
  result: jest.fn(),
  one: jest.fn()
};

const successResponse = {
  status: 'success',
  statusCode: 200
};

describe("Twitter Connect", () => {
  test("storeTwitterTokens function works correctly", async () => {

    let params = [
      'token',
      'secret',
      'key',
      'algo',
      1
    ];

    let response = [
      {
        id:1
      }
    ];

    db.one.mockImplementationOnce(()=>{
      return Promise.resolve(response);
    });

    let result = await storeTwitterTokens(twitterAuth.upsert_auth, params, db);
    expect(db.one).toHaveBeenCalledTimes(1);
    expect(db.one.mock.calls[0][0]).toEqual(twitterAuth.upsert_auth);
    expect(result[0].id).toEqual(1);
    jest.clearAllMocks();
  });

  test("deleteTwitterTokens function works correctly on empty result", async () => {

    let response = {
      rowCount:0
    };

    db.result.mockImplementationOnce(()=>{
      return Promise.resolve(response);
    });

    api.createFailedResponse.mockReturnValue({
      status: 'fail',
      statusCode: 409,
      message: 'Not connected to any twitter account'
    });

    let result = await deleteTwitterTokens(1, db, twitterAuth.disconnect);

    expect(api.createFailedResponse).toHaveBeenCalledTimes(1);
    expect(db.result).toHaveBeenCalledTimes(1);
    expect(db.result.mock.calls[0][0]).toEqual(twitterAuth.disconnect);
    expect(result.status).toBe('fail');
    expect(result.statusCode).toEqual(409);
    expect(result.message).toBe('Not connected to any twitter account');
    jest.clearAllMocks();
  });

  test("deleteTwitterTokens function works correctly on non-empty result", async () => {

    let response = {
      rowCount:1
    };

    db.result.mockImplementationOnce(()=>{
      return Promise.resolve(response);
    });

    api.createSuccessResponse.mockReturnValue({
        ...successResponse,
      data: null
    });

    let result = await deleteTwitterTokens(1, db, twitterAuth.disconnect);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.result).toHaveBeenCalledTimes(1);
    expect(db.result.mock.calls[0][0]).toEqual(twitterAuth.disconnect);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    jest.clearAllMocks();
  });
});
