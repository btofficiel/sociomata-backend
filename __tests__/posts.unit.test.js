jest.mock('date-fns/getUnixTime');
jest.mock('../lib/api');
const getUnixTime = require('date-fns/getUnixTime');
const api = require('../lib/api');
const { 
  createPost, 
  deletePost, 
  editPost,
  fetchPosts,
  createTwitterThread,
  editTwitterThread
} = require('../lib/posts')
const { post, twitter } = require('../lib/sql');

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

describe("Posts", () => {
  test("createPost function works correctly", async () => {
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

    db.one.mockImplementationOnce(()=>{
      return Promise.resolve(response);
    });

    getUnixTime.mockReturnValue(1639829992);
    api.createSuccessResponse.mockReturnValue({
      ...successResponse,
      data: {
        post: response
      }
    });
    
    let result = await createPost(payload, 1, db, post.create_post);

    expect(getUnixTime).toHaveBeenCalledTimes(1);
    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.one).toHaveBeenCalledTimes(1);
    expect(db.one.mock.calls[0][0]).toEqual(post.create_post);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data.post).toEqual(response);
    jest.clearAllMocks();
  });

  test("fetchPosts fucntion works correctly", async () => {
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
      ...successResponse,
      data: {
        posts: [response]
      }
    });

    let result = await fetchPosts(1, db, post.fetch_posts);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.manyOrNone).toHaveBeenCalledTimes(1);
    expect(db.manyOrNone.mock.calls[0][0]).toEqual(post.fetch_posts);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data.posts).toEqual([response]);
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

    db.one.mockImplementationOnce(()=>{
      return Promise.resolve(response);
    });

    api.createSuccessResponse.mockReturnValue({
      ...successResponse,
      data: {
        post: response
      }
    });
    
    let result = await editPost(payload, 1, db, post.edit_post);

    expect(api.createSuccessResponse).toHaveBeenCalledTimes(1);
    expect(db.one).toHaveBeenCalledTimes(1);
    expect(db.one.mock.calls[0][0]).toEqual(post.edit_post);
    expect(result.status).toBe('success');
    expect(result.statusCode).toEqual(200);
    expect(result.data.post).toEqual(response);
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

    expect(db.any).toHaveBeenCalledTimes(4);
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

    expect(db.any).toHaveBeenCalledTimes(4);
    jest.clearAllMocks();
  });
});
