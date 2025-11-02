import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../../decorators/rate-limit.decorator';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const forwardedForHeader = request.headers['x-forwarded-for'];
    const forwardedFor = Array.isArray(forwardedForHeader)
      ? forwardedForHeader[0]
      : forwardedForHeader;
    const ip =
      typeof forwardedFor === 'string' && forwardedFor.length > 0
        ? forwardedFor.split(',')[0].trim()
        : request.ip;

    const method = request.method ?? 'UNKNOWN';
    const normalizedPath = extractRoutePath(request);
    const key = `${method}:${normalizedPath}:${ip}`;

    const { remaining, limit, ttl } = await this.rateLimitService.checkRateLimit(
      key,
      rateLimitOptions,
    );

    reply.header('X-RateLimit-Limit', limit.toString());
    reply.header('X-RateLimit-Remaining', remaining.toString());
    reply.header('X-RateLimit-Reset', (Date.now() + ttl * 1000).toString());

    if (remaining === 0) {
      reply.header('Retry-After', ttl.toString());
      throw new HttpException(
        'Too many requests - please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

const extractRoutePath = (request: FastifyRequest): string => {
  const routerPath =
    typeof (request as FastifyRequest & { routerPath?: unknown }).routerPath === 'string'
      ? (request as FastifyRequest & { routerPath: string }).routerPath
      : undefined;

  const routeOptionsUrl =
    typeof (request as FastifyRequest & { routeOptions?: { url?: unknown } }).routeOptions?.url ===
    'string'
      ? (request as FastifyRequest & { routeOptions: { url: string } }).routeOptions.url
      : undefined;

  const fallbackPath = request.url?.split('?')[0] ?? '/';

  return routerPath ?? routeOptionsUrl ?? fallbackPath;
};
