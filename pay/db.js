const pg = require('pg')
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'book',
  password: 'mohit',
  port: 5432, 
});


module.exports = pool