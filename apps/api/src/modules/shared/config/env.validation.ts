import * as Joi from 'joi';

// Validation stricte des variables d environnement critiques (Section N / TASK-019).
// L application refuse de demarrer si l une d elles est absente ou invalide.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  DATABASE_URL: Joi.string().uri().required(),
  PORT: Joi.number().default(3000),
});
