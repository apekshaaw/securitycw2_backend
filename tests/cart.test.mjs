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
  await mongoose.connection.close();
});

describe('🛒 Cart Routes', () => {
  const setupTestUserAndProduct = async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Cart User',
      email: 'cartuser@example.com',
      password: '123456',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'cartuser@example.com',
      password: '123456',
    });

    const token = loginRes.body.token;

    const productRes = await request(app).post('/api/products').send({
      name: 'Test Product',
      category: 'Dresses',
      sizes: ['S', 'M'],
      price: 49.99,
      image: 'https://example.com/image.jpg',
      availability: true,
      description: 'Test product description',
    });

    return { token, productId: productRes.body._id };
  };

  test('✅ should add product to cart', async () => {
    const { token, productId } = await setupTestUserAndProduct();

    const res = await request(app)
      .post('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product: productId, quantity: 2, selectedSize: 'M' });

    expect(res.status).toBe(200);
    expect(res.body.cart.length).toBe(1);
  });

  test('✅ should get cart items', async () => {
    const { token, productId } = await setupTestUserAndProduct();

    await request(app)
      .post('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product: productId, quantity: 2, selectedSize: 'M' });

    const res = await request(app)
      .get('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.cart.length).toBeGreaterThan(0);
  });

  test('✅ should update cart quantity', async () => {
    const { token, productId } = await setupTestUserAndProduct();

    await request(app)
      .post('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product: productId, quantity: 1, selectedSize: 'M' });

    const res = await request(app)
      .put('/api/auth/cart/update')
      .set('Authorization', `Bearer ${token}`)
      .send({ product: productId, selectedSize: 'M', quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.cart[0].quantity).toBe(5);
  });

  test('✅ should remove product from cart', async () => {
    const { token, productId } = await setupTestUserAndProduct();

    await request(app)
      .post('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product: productId, quantity: 1, selectedSize: 'M' });

    const res = await request(app)
      .delete('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product: productId, selectedSize: 'M' });

    expect(res.status).toBe(200);
    expect(res.body.cart.length).toBe(0);
  });

  test('❌ should not add to cart with missing fields', async () => {
    const { token } = await setupTestUserAndProduct();

    const res = await request(app)
      .post('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Product ID and selected size are required');
  });

  test('✅ should add again for overwrite test', async () => {
    const { token, productId } = await setupTestUserAndProduct();

    await request(app)
      .post('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product: productId, quantity: 1, selectedSize: 'S' });

    const res = await request(app)
      .get('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.cart.length).toBe(1);
  });

  test('✅ should overwrite the cart', async () => {
    const { token, productId } = await setupTestUserAndProduct();

    const res = await request(app)
      .put('/api/auth/cart/overwrite')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cart: [{ product: productId, quantity: 3, selectedSize: 'M' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.cart.length).toBe(1);
    expect(res.body.cart[0].quantity).toBe(3);
  });

  test('❌ should reject overwrite with invalid cart format', async () => {
    const { token } = await setupTestUserAndProduct();

    const res = await request(app)
      .put('/api/auth/cart/overwrite')
      .set('Authorization', `Bearer ${token}`)
      .send({ cart: 'not-an-array' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cart must be an array');
  });

  test('❌ should not update quantity for missing product', async () => {
    const { token } = await setupTestUserAndProduct();

    const res = await request(app)
      .put('/api/auth/cart/update')
      .set('Authorization', `Bearer ${token}`)
      .send({
        product: new mongoose.Types.ObjectId(),
        selectedSize: 'L',
        quantity: 2,
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.cart)).toBe(true);
  });

  test('❌ should not remove non-existing product', async () => {
    const { token } = await setupTestUserAndProduct();

    const res = await request(app)
      .delete('/api/auth/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({
        product: new mongoose.Types.ObjectId(),
        selectedSize: 'XL',
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.cart)).toBe(true);
  });
});
