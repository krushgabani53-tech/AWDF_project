const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CLIENT_URL can hold one or many origins, comma-separated:
// CLIENT_URL=https://awdf1project.vercel.app,http://localhost:5173
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, '')) // trim spaces and trailing slash
  .filter(Boolean);

// Needed on Render (behind a proxy) so secure cookies work
app.set('trust proxy', 1);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (ALLOWED_ORIGINS.includes(origin) || (NODE_ENV !== 'production' && isLocalhost)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);