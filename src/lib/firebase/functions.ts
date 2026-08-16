import { getFunctions } from 'firebase/functions'
import { app } from './config'

// Every paid model call goes through a Cloud Function. API keys never reach
// the client.
export const functions = getFunctions(app)
