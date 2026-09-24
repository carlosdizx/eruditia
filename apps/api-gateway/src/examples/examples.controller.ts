import { Body, Controller, Get, Post } from '@nestjs/common';
import ExamplesService from './examples.service';
import CreateExampleDto from './dto/create-example.dto';

@Controller('examples')
export default class ExamplesController {
  constructor(private readonly examplesService: ExamplesService) {}

  @Post()
  public async createExample(@Body() dto: CreateExampleDto) {
    return await this.examplesService.createExample(dto);
  }

  @Get()
  public async listExample() {
    return await this.examplesService.findAll();
  }
}
