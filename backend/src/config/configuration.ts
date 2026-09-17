export default (): Record<string, unknown> => ({
  port: parseInt(process.env.PORT ?? '4002', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY ?? '',
    secretKey: process.env.MINIO_SECRET_KEY ?? '',
    bucket: process.env.MINIO_BUCKET ?? 'tax-files',
  },
  toss: {
    clientKey: process.env.TOSS_CLIENT_KEY ?? '',
    secretKey: process.env.TOSS_SECRET_KEY ?? '',
  },
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3002').split(','),
});
