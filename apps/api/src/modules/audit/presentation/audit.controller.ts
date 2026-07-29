import { Controller, Get, NotImplementedException } from '@nestjs/common';

@Controller('audit-events')
export class AuditController {
  @Get()
  placeholder(): never {
    throw new NotImplementedException();
  }
}
