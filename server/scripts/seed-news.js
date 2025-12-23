const path = require('path');

const envPath = [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../.env')].find((candidate) =>
  require('fs').existsSync(candidate),
);

require('dotenv').config({ path: envPath });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categoryData = {
  name: 'اخبار املاک',
  slug: 'real-estate-news',
};

const tagData = [
  { name: 'قیمت', slug: 'price' },
  { name: 'سرمایه‌گذاری', slug: 'investment' },
  { name: 'اجاره', slug: 'rent' },
  { name: 'خرید', slug: 'buy' },
  { name: 'وام', slug: 'loan' },
];

const newsItems = [
  {
    title: 'رشد ملایم قیمت مسکن در پاییز ۱۴۰۴',
    slug: 'price-trend-1404',
    shortText: 'بررسی آخرین آمارها نشان می‌دهد بازار مسکن در فصل پاییز با شیب ملایم رشد همراه بوده است.',
    content:
      'بر اساس گزارش‌های میدانی و داده‌های ثبت‌شده، میانگین قیمت معاملات مسکن در پاییز ۱۴۰۴ رشد محدودی داشته است. کارشناسان می‌گویند سهم واحدهای میان‌متراژ در این رشد بیشتر بوده و مناطق دارای دسترسی حمل‌ونقل عمومی همچنان تقاضای بالایی دارند. پیشنهاد می‌شود خریداران قبل از تصمیم نهایی، بازه‌های قیمتی محله‌های مجاور را نیز مقایسه کنند.',
    mainImageUrl: '/news/real-estate-1.jpg',
    tagSlugs: ['price', 'buy'],
  },
  {
    title: 'تسهیلات جدید نوسازی بافت فرسوده اعلام شد',
    slug: 'renewal-loans',
    shortText: 'طرح تازه برای نوسازی محلات قدیمی با تمرکز بر تسهیلات کم‌بهره معرفی شد.',
    content:
      'در طرح جدید نوسازی بافت فرسوده، تسهیلات کم‌بهره برای مالکان و سازندگان در نظر گرفته شده است. این طرح با هدف افزایش کیفیت ساخت و بهبود دسترسی به خدمات شهری اجرا می‌شود. کارشناسان توصیه می‌کنند قبل از اقدام، ضوابط محلی و شرایط دریافت وام را از مراجع رسمی بررسی کنید.',
    mainImageUrl: '/news/real-estate-2.jpg',
    tagSlugs: ['loan', 'investment'],
  },
  {
    title: 'افزایش عرضه واحدهای اجاره‌ای در کرج',
    slug: 'karaj-rent-supply',
    shortText: 'گزارش‌ها از افزایش فایل‌های اجاره‌ای در برخی مناطق کرج خبر می‌دهد.',
    content:
      'با ورود فایل‌های جدید به بازار اجاره در کرج، رقابت بین موجران افزایش یافته است. مناطق با دسترسی مناسب به مسیرهای بین‌شهری و مراکز خدماتی بیشترین سهم عرضه را داشته‌اند. انتظار می‌رود در هفته‌های آینده با تثبیت نرخ‌ها، فرصت مذاکره برای مستاجران بیشتر شود.',
    mainImageUrl: '/news/real-estate-3.jpg',
    tagSlugs: ['rent', 'price'],
  },
  {
    title: 'آرامش نسبی در بازار واحدهای نوساز',
    slug: 'new-build-market',
    shortText: 'معاملات واحدهای نوساز وارد فاز آرام‌تر شده و زمان فروش افزایش یافته است.',
    content:
      'بازار واحدهای نوساز در هفته‌های اخیر با کاهش حجم معاملات مواجه بوده است. فعالان این بخش می‌گویند خریداران بیشتر به کیفیت ساخت و امکانات مشترک توجه می‌کنند و حاضرند زمان بیشتری برای انتخاب صرف کنند. پیشنهاد می‌شود فروشندگان با ارائه اطلاعات دقیق‌تر و شفاف‌تر اعتماد خریداران را جلب کنند.',
    mainImageUrl: '/news/real-estate-4.jpg',
    tagSlugs: ['buy', 'investment'],
  },
  {
    title: 'راهنمای انتخاب محله بر اساس دسترسی و امکانات',
    slug: 'neighborhood-guide',
    shortText: 'پیش از خرید یا اجاره، شاخص‌های دسترسی محله می‌تواند هزینه‌های آینده را کاهش دهد.',
    content:
      'انتخاب محله مناسب تنها به قیمت محدود نمی‌شود. دسترسی به حمل‌ونقل عمومی، مراکز آموزشی، درمانی و خدمات روزمره نقش مهمی در کیفیت زندگی دارد. کارشناسان توصیه می‌کنند در بازدیدها، فاصله تا خدمات اصلی و وضعیت ترافیک را نیز بررسی کنید تا تصمیم دقیق‌تری بگیرید.',
    mainImageUrl: '/news/real-estate-5.jpg',
    tagSlugs: ['buy', 'rent'],
  },
];

async function main() {
  const category = await prisma.newsCategory.upsert({
    where: { slug: categoryData.slug },
    update: { name: categoryData.name, isActive: true },
    create: {
      name: categoryData.name,
      slug: categoryData.slug,
      isActive: true,
    },
  });

  const tags = await Promise.all(
    tagData.map((tag) =>
      prisma.newsTag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name },
        create: tag,
      }),
    ),
  );

  const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag]));

  for (const item of newsItems) {
    const tagIds = item.tagSlugs
      .map((slug) => tagBySlug.get(slug)?.id)
      .filter(Boolean);

    await prisma.news.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        shortText: item.shortText,
        content: item.content,
        mainImageUrl: item.mainImageUrl,
        categoryId: category.id,
        tags: {
          deleteMany: {},
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
      create: {
        title: item.title,
        slug: item.slug,
        shortText: item.shortText,
        content: item.content,
        mainImageUrl: item.mainImageUrl,
        categoryId: category.id,
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
