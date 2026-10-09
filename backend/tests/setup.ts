import mongoose from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';

// Use TEST_MONGODB_URI (e.g. a local/Docker MongoDB) if provided; otherwise spin up an
// in-memory MongoDB (downloads a mongod binary on first run).
let mongo: MongoMemoryServer | undefined;

beforeAll(async () => {
  if (process.env.TEST_MONGODB_URI) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
    return;
  }
  const { MongoMemoryServer: Server } = await import('mongodb-memory-server');
  mongo = await Server.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
