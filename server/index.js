const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const DIST_DIR = path.join(__dirname, '../dist/classic-traveller-map-man');

function createPool(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const sslmode = parsed.searchParams.get('sslmode');
  parsed.searchParams.delete('sslmode');
  const connectionString = parsed.toString();

  if (!sslmode || sslmode === 'disable') {
    return new Pool({ connectionString });
  }

  const verify = sslmode === 'verify-full' || sslmode === 'verify-ca';
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: verify }
  });
}

function createApp(pool) {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({ ok: false });
    }
  });

  app.get('/api/kv/:key', async (req, res) => {
    if (!KEY_PATTERN.test(req.params.key)) {
      res.status(400).json({ error: 'Invalid key' });
      return;
    }
    try {
      const result = await pool.query('SELECT value FROM kv WHERE key = $1', [req.params.key]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(result.rows[0].value);
    } catch (error) {
      console.error('Failed to read key:', error);
      res.status(500).json({ error: 'Failed to read key' });
    }
  });

  app.put('/api/kv/:key', async (req, res) => {
    if (!KEY_PATTERN.test(req.params.key)) {
      res.status(400).json({ error: 'Invalid key' });
      return;
    }
    if (req.body === undefined || req.body === null || typeof req.body !== 'object') {
      res.status(400).json({ error: 'JSON object or array body required' });
      return;
    }
    try {
      await pool.query(
        `INSERT INTO kv (key, value, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value,
               updated_at = now()`,
        [req.params.key, JSON.stringify(req.body)]
      );
      res.status(204).end();
    } catch (error) {
      console.error('Failed to write key:', error);
      res.status(500).json({ error: 'Failed to write key' });
    }
  });

  app.delete('/api/kv/:key', async (req, res) => {
    if (!KEY_PATTERN.test(req.params.key)) {
      res.status(400).json({ error: 'Invalid key' });
      return;
    }
    try {
      await pool.query('DELETE FROM kv WHERE key = $1', [req.params.key]);
      res.status(204).end();
    } catch (error) {
      console.error('Failed to delete key:', error);
      res.status(500).json({ error: 'Failed to delete key' });
    }
  });

  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'), (error) => {
      if (error) {
        next(error);
      }
    });
  });

  return app;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = createPool(databaseUrl);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const port = Number(process.env.PORT) || 8080;
  const app = createApp(pool);
  app.listen(port, () => {
    console.log(`Listening on ${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
