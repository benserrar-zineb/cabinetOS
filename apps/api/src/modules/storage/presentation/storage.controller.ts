import { Controller, Get, NotImplementedException } from '@nestjs/common';

@Controller('files')
export class StorageController {
  @Get()
  placeholder(): never {
    throw new NotImplementedException();
  }
}
