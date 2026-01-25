import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import Product from '../models/Product.js';

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/rentmyfit_test');
});

afterEach(async () => {
  await Product.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('🧪 Product CRUD Tests', () => {
  const createProduct = async () => {
    const res = await request(app).post('/api/products').send({
      name: 'Test Shirt',
      category: 'Shirts',
      sizes: ['S', 'M', 'L'],
      price: 25.99,
      image: 'test.jpg',
      description: 'A comfortable shirt',
    });
    return res.body;
  };

  test('✅ should create a new product', async () => {
    const res = await request(app).post('/api/products').send({
      name: 'Test Shirt',
      category: 'Shirts',
      sizes: ['S', 'M', 'L'],
      price: 25.99,
      image: 'test.jpg',
      description: 'A comfortable shirt',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
  });

  test('✅ should get all products', async () => {
    await createProduct();

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('✅ should get product by ID', async () => {
    const product = await createProduct();

    const res = await request(app).get(`/api/products/${product._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('_id', product._id);
  });

  test('✅ should update product name', async () => {
    const product = await createProduct();

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .send({ name: 'Updated Shirt' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Shirt');
  });

  test('✅ should update product price', async () => {
    const product = await createProduct();

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .send({ price: 30.5 });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe(30.5);
  });

  test('❌ should return 500 for invalid ID format', async () => {
    const res = await request(app).get('/api/products/invalidid123');
    expect(res.status).toBe(500);
  });

  test('✅ should delete the product', async () => {
    const product = await createProduct();

    const res = await request(app).delete(`/api/products/${product._id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deleted successfully');
  });

  test('❌ should return 404 for deleted product', async () => {
    const product = await createProduct();
    await request(app).delete(`/api/products/${product._id}`);

    const res = await request(app).get(`/api/products/${product._id}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Not found');
  });
});
