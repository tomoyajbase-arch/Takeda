import express from 'express'
import cors from 'cors'
import chatRoutes from './routes/chat'
import workflowRoutes from './routes/workflow'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/chat', chatRoutes)
app.use('/api/workflow', workflowRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`🏢 AI Company Server running on http://localhost:${PORT}`)
})
