import { Controller, Get, NotImplementedException } from '@nestjs/common';

@Controller('notifications')
export class NotificationsController {
  @Get()
  placeholder(): never {
    throw new NotImplementedException();
  }
}
