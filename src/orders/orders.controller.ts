import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        planId: { type: 'string' },
        successUrl: { type: 'string' },
        cancelUrl: { type: 'string' },
      },
      required: ['planId', 'successUrl', 'cancelUrl'],
    },
  })
  async checkout(
    @Request() req,
    @Body() body: { planId: string; successUrl: string; cancelUrl: string },
  ) {
    return this.ordersService.createCheckoutSession(
      req.user.id,
      body.planId,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyOrders(@Request() req) {
    return this.ordersService.findUserOrders(req.user.id);
  }
}