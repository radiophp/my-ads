export type DivarDistrictPriceReportRow = {
  districtId: number;
  districtName: string;
  districtSlug: string;
  postCount: number;
  minPriceTotal: number | null;
  avgPriceTotal: number | null;
  maxPriceTotal: number | null;
  minPricePerSquare: number | null;
  avgPricePerSquare: number | null;
  maxPricePerSquare: number | null;
  minRentAmount: number | null;
  avgRentAmount: number | null;
  maxRentAmount: number | null;
  minDepositAmount: number | null;
  avgDepositAmount: number | null;
  maxDepositAmount: number | null;
};
