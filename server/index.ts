import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat';
import workflowRouter from './routes/workflow';

const app = express();
const PORT = 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/chat', chatRouter);
app.use('/api/workflow', workflowRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Company Server is running' });
});

app.listen(PORT, () => {
  console.log(`🏢 AI Company Server running on http://localhost:${PORT}`);
});
