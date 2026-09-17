import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const statusCode = this.resolveStatusCode(context);

    return next.handle().pipe(
      map((data) => ({
        data,
        message: 'success',
        statusCode,
      })),
    );
  }

  private resolveStatusCode(context: ExecutionContext): number {
    const explicitCode = Reflect.getMetadata(
      HTTP_CODE_METADATA,
      context.getHandler(),
    ) as number | undefined;
    if (explicitCode) {
      return explicitCode;
    }

    const request = context.switchToHttp().getRequest<{ method?: string }>();
    return request?.method === 'POST' ? HttpStatus.CREATED : HttpStatus.OK;
  }
}
