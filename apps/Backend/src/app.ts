import express from 'express';
import cors from "cors";
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { apiLogger } from './middlewares/logger.middleware';
import authRoutes from './routes/auth'
import { authenticateJWT } from './middlewares/auth.middleware';
import dotenv from 'dotenv';

dotenv.config();
const FRONTEND_URL = process.env.FRONTEND_URL;


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data
app.use(apiLogger);


console.log(FRONTEND_URL);

app.use(cors({
  origin: FRONTEND_URL, // Make sure this matches the frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow these HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers
credentials: true,     
}));


app.use('/api/auth', authRoutes);
app.use('/api', authenticateJWT, routes);  

app.use(errorHandler);

export default app;