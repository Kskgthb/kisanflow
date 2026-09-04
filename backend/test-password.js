const { Pool } = require('pg');

// Different passwords try karo
const passwords = [
  'Postgres@',
  'admin',
  'root',
  'password',
  '12345',
  '',
  'postgres123',
  'admin123',
];

async function testPassword(password) {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Default database
    password: password,
    port: 5432,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log(`✅ Password "${password}" works!`);
    await pool.end();
    return true;
  } catch (error) {
    console.log(`❌ Password "${password}" failed`);
    await pool.end();
    return false;
  }
}

async function main() {
  console.log('🔍 Testing passwords...\n');
  
  for (const password of passwords) {
    const works = await testPassword(password);
    if (works) {
      console.log(`\n🎉 Use this password in .env file: DB_PASSWORD=${password}`);
      break;
    }
  }
}

main();