import { Controller, Get, NotImplementedException } from '@nestjs/common';

@Controller('identity')
export class IdentityController {
  @Get()
  placeholder(): never {
    throw new NotImplementedException();
  }
}
