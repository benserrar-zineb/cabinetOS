import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

// TASK-008 : pool de connexions PostgreSQL + scoping applicatif par organisation.
// Toute requete sur une table Core doit passer par withOrganizationScope, qui positionne
// SET LOCAL app.organization_id via set_config (parametre, pas d injection possible),
// dans une transaction dediee -- donc jamais de fuite entre requetes concurrentes sur le pool.
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  readonly db: NodePgDatabase;

  constructor(configService: ConfigService) {
    this.pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
    });
    this.db = drizzle(this.pool);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Execute callback dans une transaction scopee a l organisation donnee.
   * Echoue explicitement si organizationId est absent.
   */
  async withOrganizationScope<T>(
    organizationId: string,
    callback: (tx: NodePgDatabase) => Promise<T>,
  ): Promise<T> {
    if (!organizationId) {
      throw new Error(
        'withOrganizationScope: organizationId est requis, aucune requete ne peut etre executee sans contexte d organisation.',
      );
    }

    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.organization_id', ${organizationId}, true)`);
      return callback(tx);
    });
  }
}
