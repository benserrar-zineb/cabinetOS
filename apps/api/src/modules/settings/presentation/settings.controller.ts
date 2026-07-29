import { Controller, Get, NotImplementedException } from '@nestjs/common';

@Controller('settings')
export class SettingsController {
  @Get()
  placeholder(): never {
    throw new NotImplementedException();
  }
}
