jest.mock('../lib/api');
const api = require('../lib/api');
const {
  createPlug,
  editPlug,
  fetchPlugs,
  deletePlug
} = require('../lib/plugs');

const { plug } = require('../lib/sql');

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

describe("Plugs", () => {
  test("createPlug function works correctly", async () => {
    let payload = {
      "name": "Web Course",
      "plug": "Buy course at Gumroad"
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
        plug: response
      }
    });

    let result = await createPlug(payload, 1, db, plug.create_plug);
    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.one).toHaveBeenCalledTimes(1);
    expect(db.one.mock.calls[0][0]).toEqual(plug.create_plug);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data.plug).toEqual(response);
    jest.clearAllMocks();
  });

  test("editPlug function works correctly", async () => {
    let payload = {
      "name": "Web Course",
      "plug": "Buy course at Gumroad"
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
        plug: response
      }
    });

    let result = await editPlug(payload, 1, 1, db, plug.edit_plug);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.one).toHaveBeenCalledTimes(1);
    expect(db.one.mock.calls[0][0]).toEqual(plug.edit_plug);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data.plug).toEqual(response);
    jest.clearAllMocks();
  });

  test("fetchPlugs function works correctly", async () => {
    let payload = {
      "name": "Web Course",
      "plug": "Buy course at Gumroad"
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
        plugs: [response]
      }
    });
    
    let result = await fetchPlugs(1, db, plug.fetch_plugs);
    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.manyOrNone).toHaveBeenCalledTimes(1);
    expect(db.manyOrNone.mock.calls[0][0]).toEqual(plug.fetch_plugs);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data.plugs).toEqual([response]);
    jest.clearAllMocks();
  });

  test("deletePlug function works correctly", async () => {
    db.any.mockImplementationOnce(()=>{
      return Promise.resolve();
    });

    api.createSuccessResponse.mockReturnValue({
      ...successResponse,
      data: null
    });
    let result = await deletePlug(1, 1, db, plug.delete_plug);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.any).toHaveBeenCalledTimes(1);
    expect(db.any.mock.calls[0][0]).toEqual(plug.delete_plug);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data).toEqual(null);
    jest.clearAllMocks();
  });
});

