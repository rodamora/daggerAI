import { resolve } from 'path'
import dotenv from 'dotenv'

const isDev = process.env.NODE_ENV === 'development'

if (isDev) {
  dotenv.config({ path: resolve(__dirname, '../', '.env') })
}
