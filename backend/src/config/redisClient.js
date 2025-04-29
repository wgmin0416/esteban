const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.connect().catch(console.error);

module.exports = redisClient;
