import { app } from './app';
import { env } from './config/env';
import { prisma } from '@trustvault/database';

async function startServer() {
  try {
    // Verify database connection with automatic retry for Supabase cold starts / standby wakeups
    let retries = 5;
    while (retries > 0) {
      try {
        await prisma.$connect();
        break;
      } catch (err: any) {
        retries--;
        if (retries === 0) throw err;
        console.warn(`[DATABASE] Connection attempt failed (${err.errorCode || err.code || 'P1001'}). Waking up database, retrying in 3s... (${retries} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    console.log('✅ Supabase PostgreSQL connected successfully (trustvault schema)');

    const server = app.listen(env.PORT, env.HOST, () => {
      console.log(`🚀 TrustVault Security API listening at http://${env.HOST}:${env.PORT}/api/v1`);
      console.log(`🛡️  Zero-Trust RBAC & Immediate Revocation Active`);
      console.log(`🔐 Cryptographic Audit Chaining Active`);
    });

    const shutdown = async () => {
      console.log('\nShutting down TrustVault gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Safe shutdown complete.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to initialize TrustVault backend:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

