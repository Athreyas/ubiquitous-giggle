import { createDatabase, defaultDatabasePath } from './db.js'

const database = createDatabase()
database.close()

console.log(`Warren database is ready at ${defaultDatabasePath()}`)
