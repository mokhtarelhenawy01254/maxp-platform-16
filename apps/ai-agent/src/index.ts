import 'dotenv/config'
import { createServer } from './api/server'

const PORT = Number(process.env.PORT ?? 3001)

const app = createServer()

app.listen(PORT, () => {
  console.log(`AI Agent service running on http://localhost:${PORT}`)
})
