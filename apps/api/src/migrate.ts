import { createDatabase, defaultDatabasePath } from './db.js'

const database = createDatabase()
database.close()

console.log(`Daymark database is ready at ${defaultDatabasePath()}`)
