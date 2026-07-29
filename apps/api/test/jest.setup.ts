import { config } from 'dotenv';
import { resolve } from 'path';

// Charge une configuration de test locale, independante de l environnement de la machine.
config({ path: resolve(__dirname, '../.env.test'), quiet: true });
