import { Controller, Get, Res } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyReply } from 'fastify';

const FAVICON_PATH = join(process.cwd(), 'favicon.ico');
const CACHE_CONTROL_HEADER = 'public, max-age=86400, immutable';

let cachedFavicon: Buffer | null = null;

const loadFavicon = (): Buffer | null => {
  if (cachedFavicon) {
    return cachedFavicon;
  }

  if (!existsSync(FAVICON_PATH)) {
    return null;
  }

  cachedFavicon = readFileSync(FAVICON_PATH);
  return cachedFavicon;
};

@Controller()
export class FaviconController {
  @Get('favicon.ico')
  getFavicon(@Res() res: FastifyReply): void {
    const favicon = loadFavicon();

    if (!favicon) {
      res.status(404).send();
      return;
    }

    res
      .header('Content-Type', 'image/png')
      .header('Cache-Control', CACHE_CONTROL_HEADER)
      .send(favicon);
  }
}
