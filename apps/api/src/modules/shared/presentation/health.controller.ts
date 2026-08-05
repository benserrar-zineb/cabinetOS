import { Controller, Get } from '@nestjs/common';
import { Public } from './public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      data: { status: 'ok' },
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
