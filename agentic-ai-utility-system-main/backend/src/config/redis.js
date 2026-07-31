export const redisConfig = {
  host: '127.0.0.1',
  port: 6379
};

// Dummy adapter (SAFE for development)
export const createRedisAdapter = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_ENABLED) {
    throw new Error('Redis adapter disabled in production. Enable with REDIS_ENABLED=true');
  }
  console.log('⚠️ Redis adapter disabled - Socket.io will not scale horizontally');
  return null;
};

// Dummy pub/sub
export const redisPubSub = {
  publish: () => { },
  subscribe: () => { }
};
