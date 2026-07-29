import { Controller, Get, NotImplementedException } from '@nestjs/common';

@Controller('organizations')
export class OrganizationController {
  @Get()
  placeholder(): never {
    throw new NotImplementedException();
  }
}
