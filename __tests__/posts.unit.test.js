jest.mock('date-fns/getUnixTime');
jest.mock('../lib/api');
jest.mock('../lib/utils');
const getUnixTime = require('date-fns/getUnixTime');
const api = require('../lib/api');
const utils = require('../lib/utils');
const { 
  createPost, 
  deletePost, 
  editPost,
  fetchPostsQueue,
  createTwitterThread,
  editTwitterThread
} = require('../lib/posts')
const { post, twitter } = require('../lib/sql');

jest.setTimeout(10000);

afterAll(done => {
  setTimeout(done);
});

const db = {
  none: jest.fn(),
  any: jest.fn(),
  manyOrNone: jest.fn(),
  oneOrNone: jest.fn(),
  one: jest.fn(),
  batch: jest.fn(),
  tx: jest.fn()
};

const successResponse = {
  status: 'success',
  statusCode: 200
};

describe("Posts", () => {
  test("createPost function works correctly | success case", async () => {
    let payload = {
      "timestamp": 1639829992,
      "recurring": true,
      "description": "Hello World",
      "category_id": null,
      "tweets": [
          {
              "tweet": "Hello World",
              "tweet_order": 1
          },
          {
              "tweet": "My name is Bhaskar",
              "tweet_order": 2 
          },
          {
              "tweet": "Over!",
              "tweet_order": 3
          }
      ]
    };

    let response = {
        "id": 1,
        "timestamp": 1639829940,
        "recurring": true,
        "description": "Hello World",
        "category_id": null,
        "user_id": 1,
        "post_type": 1,
        "status": 1
    };

    utils.uploadMedia.mockReturnValue("");

    db.one.mockImplementationOnce(()=>{
      return Promise.resolve(response);
    });

    db.oneOrNone.mockImplementationOnce(() => {
      return true
    });

    getUnixTime.mockReturnValue(1639829992);

    api.createSuccessResponse.mockReturnValue({
      ...successResponse
    });
    
    let result = await createPost(payload, 1, db, post.create_post);

    expect(getUnixTime).toHaveBeenCalledTimes(1);
    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.oneOrNone).toHaveBeenCalledTimes(1);
    expect(db.tx).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    jest.clearAllMocks();
  });

  test("createPost function works correctly | fail case", async () => {
    let payload = {
      "timestamp": 1639829992,
      "recurring": true,
      "description": "Hello World",
      "category_id": null,
      "tweets": [
          {
              "tweet": "Hello World",
              "tweet_order": 1
          },
          {
              "tweet": "My name is Bhaskar",
              "tweet_order": 2 
          },
          {
              "tweet": "Over!",
              "tweet_order": 3
          }
      ]
    };

    let response = {
        "id": 1,
        "timestamp": 1639829940,
        "recurring": true,
        "description": "Hello World",
        "category_id": null,
        "user_id": 1,
        "post_type": 1,
        "status": 1
    };


    utils.uploadMedia.mockReturnValue("");

    db.oneOrNone.mockImplementationOnce(() => {
      return null;
    });


    api.createFailedResponse.mockReturnValue({
      status: "fail",
      statusCode: 409
    });
    
    let result = await createPost(payload, 1, db, post.create_post);

    expect(api.createFailedResponse).toHaveBeenCalledTimes(1);
    expect(db.oneOrNone).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('fail');
    expect(result.statusCode).toEqual(409);
    jest.clearAllMocks();
  });

  test("fetchPostsQueue fucntion works correctly", async () => {
    let response = {
        "id": 1,
        "timestamp": 1639829940,
        "recurring": true,
        "description": "Hello World",
        "category_id": null,
        "user_id": 1,
        "post_type": 1,
        "status": 1
    };

    db.manyOrNone.mockImplementationOnce(()=>{
      return Promise.resolve([response]);
    });

    api.createSuccessResponse.mockReturnValue({
      ...successResponse
    });


    let result = await fetchPostsQueue(1, db, {posts: post.fetch_posts});

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.oneOrNone).toHaveBeenCalledTimes(1);
    expect(db.manyOrNone).toHaveBeenCalledTimes(1);
    expect(db.manyOrNone.mock.calls[0][0]).toEqual(post.fetch_posts);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    jest.clearAllMocks();
  });

  test("editPost function works correctly", async () => {
    let payload = {
      "timestamp": 1639829992,
      "recurring": true,
      "description": "Hello World",
      "category_id": null,
      "tweets": [
          {
              "tweet": "Hello World",
              "tweet_order": 1
          },
          {
              "tweet": "My name is Bhaskar",
              "tweet_order": 2 
          },
          {
              "tweet": "My name is Bhaskar Thakur",
              "tweet_order": 3 
          },
          {
              "tweet": "Over!",
              "tweet_order": 4
          }
      ]
    };

    let response = {
        "id": 1,
        "timestamp": 1639829940,
        "recurring": true,
        "description": "Hello World",
        "category_id": null,
        "user_id": 1,
        "post_type": 1,
        "status": 1
    };

    utils.uploadMedia.mockReturnValue("");

    db.one.mockImplementationOnce(()=>{
      return Promise.resolve(response);
    });

    api.createSuccessResponse.mockReturnValue({
      ...successResponse
    });

    
    let result = await editPost(payload, 1, 1, db, {edit_post: post.edit_post});

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.tx).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    jest.clearAllMocks();
  });

  test("deletePost function works correctly", async () => {
    api.createSuccessResponse.mockReturnValue(successResponse);

    let result = await deletePost(1, 1, db, post.delete_post);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.any).toHaveBeenCalledTimes(1);
    expect(db.any.mock.calls[0][0]).toEqual(post.delete_post);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    jest.clearAllMocks();
  });

  test("createTwitterThread function works correctly", async () => {
    const tweets = [
          {
              "tweet": "Hello World",
              "tweet_order": 1
          },
          {
              "tweet": "My name is Bhaskar",
              "tweet_order": 2 
          },
          {
              "tweet": "My name is Bhaskar Thakur",
              "tweet_order": 3 
          },
          {
              "tweet": "Over!",
              "tweet_order": 4
          }
    ];


    await createTwitterThread(tweets, 1, db, twitter.create_thread);

    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.batch.mock.calls[0][0].length).toEqual(4);
    expect(db.none).toHaveBeenCalledTimes(4);
    jest.clearAllMocks();
  });

  test("editTwitterThread function works correctly", async () => {
    const tweets = [
          {
              "tweet": "Hello World",
              "tweet_order": 1
          },
          {
              "tweet": "My name is Bhaskar",
              "tweet_order": 2 
          },
          {
              "tweet": "My name is Bhaskar Thakur",
              "tweet_order": 3 
          },
          {
              "tweet": "Over!",
              "tweet_order": 4
          }
    ];

    await editTwitterThread(tweets, 1, db, twitter.upsert_thread);

    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.batch.mock.calls[0][0].length).toEqual(4);
    expect(db.none).toHaveBeenCalledTimes(4);
    jest.clearAllMocks();
  });

});
