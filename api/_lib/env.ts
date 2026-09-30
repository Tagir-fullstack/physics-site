import { config } from 'dotenv'
import path from 'node:path'

for (const file of ['.env.development.local', '.env.local', '.env']) {
  config({ path: path.resolve(process.cwd(), file) })
}
