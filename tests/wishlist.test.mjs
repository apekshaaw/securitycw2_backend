import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/rentmyfit_test');
});

afterEach(async () => {
  await User.deleteMany({});
  await Product.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('💖 Wishlist Tests', () => {
  const setup = async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Wishlist User',
      email: 'wishlist@example.com',
      password: '123456',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'wishlist@example.com',
      password: '123456',
    });

    const token = loginRes.body.token;

    const product1 = await request(app).post('/api/products').send({
      name: 'Sneakers',
      category: 'shoes',
      sizes: ['36', '37'],
      price: 80,
      image: 'img1.jpg',
      description: 'Cool kicks',
    });

    const product2 = await request(app).post('/api/products').send({
      name: 'T-Shirt',
      category: 'clothing',
      sizes: ['S', 'M', 'L'],
      price: 35,
      image: 'img2.jpg',
      description: 'Cotton shirt',
    });

    return { token, productId1: product1.body._id, productId2: product2.body._id };
  };

  test('✅ should add product to wishlist', async () => {
    const { token, productId1 } = await setup();

    const res = await request(app)
      .post('/api/auth/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productId1 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Added to wishlist');
    expect(res.body.wishlist).toContain(productId1);
  });

  test('✅ should view wishlist with 1 item', async () => {
    const { token, productId1 } = await setup();

    await request(app)
      .post('/api/auth/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productId1 });

    const res = await request(app)
      .get('/api/auth/wishlist')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.wishlist.length).toBe(1);
  });

  test('✅ should remove product from wishlist', async () => {
    const { token, productId1 } = await setup();

    await request(app)
      .post('/api/auth/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productId1 });

    const res = await request(app)
      .delete(`/api/auth/wishlist/${productId1}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Removed from wishlist');
    expect(res.body.wishlist).not.toContain(productId1);
  });

  test('❌ should not add duplicate product to wishlist', async () => {
    const { token, productId1 } = await setup();

    await request(app)
      .post('/api/auth/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productId1 });

    const res = await request(app)
      .post('/api/auth/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productId1 });

    expect(res.status).toBe(200);
    const duplicates = res.body.wishlist.filter(id => id === productId1);
    expect(duplicates.length).toBe(1);
  });

  test('❌ should fail removing a non-existent product from wishlist', async () => {
    const { token } = await setup();

    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/auth/wishlist/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.wishlist)).toBe(true);
  });

  test('❌ should block wishlist access without token', async () => {
    const res = await request(app).get('/api/auth/wishlist');
    expect(res.status).toBe(401);
    expect(res.body.message.toLowerCase()).toContain('token');
  });

  test('✅ should add multiple products and remove one', async () => {
    const { token, productId1, productId2 } = await setup();

    await request(app)
      .post('/api/auth/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productId1 });

    await request(app)
      .post('/api/auth/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productId2 });

    const res = await request(app)
      .delete(`/api/auth/wishlist/${productId1}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.wishlist).not.toContain(productId1);
    expect(res.body.wishlist).toContain(productId2);
  });

  test('✅ should return updated wishlist after full flow', async () => {
    const { token, productId2 } = await setup();

    await request(app)
      .post('/api/auth/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productId2 });

    const res = await request(app)
      .get('/api/auth/wishlist')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.wishlist.length).toBe(1);
    expect(res.body.wishlist[0]._id).toBe(productId2);
  });
});
