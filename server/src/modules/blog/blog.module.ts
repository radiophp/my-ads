import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { AdminBlogController } from './admin-blog.controller';
import { AdminBlogCategoriesController } from './admin-blog-categories.controller';
import { AdminBlogTagsController } from './admin-blog-tags.controller';
import { AdminBlogSourcesController } from './admin-blog-sources.controller';

@Module({
  controllers: [
    BlogController,
    AdminBlogController,
    AdminBlogCategoriesController,
    AdminBlogTagsController,
    AdminBlogSourcesController,
  ],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
