import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';

describe('👤 User Auth Tests', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/rentmyfit_test');
  }, 15000);

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  }, 15000);

  test('✅ should register a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Registered successfully');
  }, 15000);

  test('❌ should not register user with missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'missing@example.com',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('All fields are required');
  }, 15000);

  test('❌ should not register duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate User',
      email: 'test@example.com',
      password: '123456',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('User already exists');
  }, 15000);

  test('✅ should login with valid credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: '123456',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  }, 15000);

  test('❌ should not login with wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  }, 15000);

  test('✅ should fetch profile with valid token', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
    });

    const login = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: '123456',
    });

    const token = login.body.token;

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@example.com');
  }, 15000);

  test('❌ should fail to fetch profile with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(401);
    expect(res.body.message.toLowerCase()).toContain('invalid');
  }, 15000);

  test('✅ should update profile with valid token', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
    });

    const login = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: '123456',
    });

    const token = login.body.token;

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  }, 15000);

  test('❌ should fail to update profile without token', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .send({ name: 'No Auth' });

    expect(res.status).toBe(401);
    expect(res.body.message.toLowerCase()).toContain('token');
  }, 15000);

  test('✅ should delete account successfully', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
    });

    const login = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: '123456',
    });

    const token = login.body.token;

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Account deleted successfully');
  }, 15000);
});
