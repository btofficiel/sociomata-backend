jest.mock('jsonwebtoken');

const JWT = require('jsonwebtoken');
const { createUser, login, createAccessToken } = require('../lib/users')
const { user } = require('../lib/sql');

const jwt = {
  sign: jest.fn().mockReturnValue('token')
}


const db = {
  none: jest.fn(),
  any: jest.fn()
}

const bcrypt = {
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hash')
}

describe("Signup", () => {
  test("createUser function works correctly", async () => {
    let payload = {
      email: 'bhaskar@example.com',
      password: 'password'
    };

    await createUser(payload, db, bcrypt, user.create_user);
    expect(bcrypt.genSalt).toHaveBeenCalledTimes(1);
    expect(bcrypt.genSalt.mock.calls[0][0]).toEqual(16);
    expect(bcrypt.hash).toHaveBeenCalledTimes(1);
    expect(bcrypt.hash.mock.calls[0][0]).toEqual(payload.password);
    expect(bcrypt.hash.mock.calls[0][1]).toEqual('salt');
    expect(db.none).toHaveBeenCalledTimes(1);
    expect(db.none.mock.calls[0][0]).toEqual(user.create_user);
    expect(db.none.mock.calls[0][1]).toEqual([payload.email, 'hash', 'salt']);
  });
});

describe("createAccessToken", () => {
  test("returns a token", async () => {
    let token = createAccessToken(jwt, 'key', 1);
    expect(token).toBe('token');
  });
});

describe("Login", () => {

  test("returns status success on correct credentials", async () => {
    let payload = {
      email: 'bhaskar@example.com',
      password: 'password'
    };

    db.any.mockImplementationOnce(()=>{
      return Promise.resolve([{id: 1, email: payload.email, password: 'hash', password_salt: 'salt'}]);
    });


    JWT.sign.mockReturnValue('token');
    let loginResult = await login(payload, db, bcrypt, user.check_user);
    expect(loginResult.status).toBe('success');
    expect(loginResult.statusCode).toEqual(200);
    expect(loginResult.token).toBe('token');
  }); 

  test("returns status fail (invalid_login_credentials) on incorrect password", async () => {
    let payload = {
      email: 'bhaskar@example.com',
      password: 'password'
    };

    db.any.mockImplementationOnce(()=>{
      return Promise.resolve([{email: payload.email, password: 'hasha', password_salt: 'salt'}]);
    });

    let loginResult = await login(payload, db, bcrypt, user.check_user);
    expect(loginResult.status).toBe('fail');
    expect(loginResult.statusCode).toEqual(200);
    expect(loginResult.code).toBe('invalid_login_credentials');
  }); 

  test("returns status fail (user_not_exists) on incorrect email", async () => {
    let payload = {
      email: 'bhaskar@example.com',
      password: 'password'
    };

    db.any.mockImplementationOnce(()=>{
      return Promise.resolve([]);
    });

    let loginResult = await login(payload, db, bcrypt, user.check_user);
    expect(loginResult.status).toBe('fail');
    expect(loginResult.statusCode).toEqual(200);
    expect(loginResult.code).toBe('user_not_exists');
  }); 
});
