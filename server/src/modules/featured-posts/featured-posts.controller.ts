import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FeaturedPostsService } from './featured-posts.service';

@ApiTags('featured-posts')
@Controller('featured-posts')
export class FeaturedPostsController {
  constructor(private readonly featuredPostsService: FeaturedPostsService) {}

  @Get()
  list() {
    return this.featuredPostsService.listPublicFeaturedPosts();
  }
}
