import 'dotenv/config';
import app from '../app.js';
import mongoose from 'mongoose';
import request from 'supertest';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI_TEST;
  if (!mongoUri) throw new Error('MONGODB_URI_TEST not set');
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  await Order.deleteMany({});
  await User.deleteMany({});
  await Product.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('🧾 Order API Tests', () => {
  const createTestUserAndProduct = async () => {
    const user = await User.create({
      name: 'Order Tester',
      email: 'ordertest@example.com',
      password: 'test1234',
    });

    const product = await Product.create({
      name: 'Test Dress',
      category: 'Women',
      sizes: ['S', 'M', 'L'],
      price: 49.99,
      image: 'https://example.com/image.jpg',
    });

    return { userId: user._id, productId: product._id };
  };

  test('✅ should create a new order', async () => {
    const { userId, productId } = await createTestUserAndProduct();

    const res = await request(app).post('/api/orders').send({
      userId,
      productId,
      size: 'M',
      quantity: 2,
      rentalDate: '2025-08-01',
      returnDate: '2025-08-10',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.size).toBe('M');
    expect(res.body.quantity).toBe(2);
  });

  test('✅ should get all orders', async () => {
    const { userId, productId } = await createTestUserAndProduct();

    await request(app).post('/api/orders').send({
      userId,
      productId,
      size: 'S',
      quantity: 1,
      rentalDate: '2025-08-02',
      returnDate: '2025-08-09',
    });

    const res = await request(app).get('/api/orders');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('✅ should update an order status', async () => {
    const { userId, productId } = await createTestUserAndProduct();

    const created = await request(app).post('/api/orders').send({
      userId,
      productId,
      size: 'L',
      quantity: 3,
      rentalDate: '2025-08-03',
      returnDate: '2025-08-11',
    });

    const res = await request(app)
      .put(`/api/orders/${created.body._id}`)
      .send({ status: 'Confirmed' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('Confirmed');
  });

  test('✅ should delete an order', async () => {
    const { userId, productId } = await createTestUserAndProduct();

    const created = await request(app).post('/api/orders').send({
      userId,
      productId,
      size: 'S',
      quantity: 1,
      rentalDate: '2025-08-04',
      returnDate: '2025-08-12',
    });

    const res = await request(app).delete(`/api/orders/${created.body._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Order deleted');
  });
});
