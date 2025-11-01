import { SanitizePipe } from '@app/common/pipes/sanitize.pipe';

describe('SanitizePipe', () => {
  it('should strip script tags from strings', () => {
    const pipe = new SanitizePipe();
    const result = pipe.transform({ field: '<script>alert(1)</script>hello' }, { type: 'body' } as any);

    expect(result.field).toBe('hello');
  });

  it('should sanitize nested objects', () => {
    const pipe = new SanitizePipe();
    const payload = {
      level1: {
        level2: '<img src=x onerror=javascript:alert(1) />',
      },
    };

    const result = pipe.transform(payload, { type: 'body' } as any);

    expect(result.level1.level2.includes('javascript')).toBe(false);
  });
});
