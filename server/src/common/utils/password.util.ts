import * as bcrypt from 'bcrypt';

const DEFAULT_SALT_ROUNDS = 12;

export const hashPassword = async (plain: string, saltRounds = DEFAULT_SALT_ROUNDS): Promise<string> => {
  return bcrypt.hash(plain, saltRounds);
};

export const comparePassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};
