import express from 'express'
import { agentRouter } from './routes/agent'
import { toolsRouter } from './routes/tools'
import { subAgentsRouter } from './routes/sub-agents'

export function createServer() {
  const app = express()

  app.use(express.json())

  app.use('/agent', agentRouter)
  app.use('/tools', toolsRouter)
  app.use('/agents', subAgentsRouter)

  app.get('/health', (_req, res) => res.json({ ok: true }))

  return app
}
