import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { DashboardService, DashboardSummary } from './dashboard.service';

@ApiTags('dashboard')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: User,
    @Query('year') year?: string,
  ): Promise<DashboardSummary> {
    return this.dashboardService.getCurrentYearSummary(user.id, year ? parseInt(year, 10) : undefined);
  }
}
