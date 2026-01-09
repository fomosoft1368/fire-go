import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse() as any;

    console.log('[HttpExceptionFilter] Exception caught:', {
      method: request.method,
      path: request.path,
      statusCode: status,
      message: exceptionResponse.message || exception.message,
    });

    response.status(status).json({
      statusCode: status,
      message: exceptionResponse.message || exception.message,
      timestamp: new Date().toISOString(),
      path: request.path,
    });
  }
}
