import { Controller, Get, NotImplementedException } from '@nestjs/common';

@Controller('roles')
export class AccessControlController {
  @Get()
  placeholder(): never {
    throw new NotImplementedException();
  }
}
