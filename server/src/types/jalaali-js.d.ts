declare module 'jalaali-js' {
  export function toGregorian(
    jy: number,
    jm: number,
    jd: number,
  ): {
    gy: number;
    gm: number;
    gd: number;
  };
}
