import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET ortam değişkeni ayarlanmamış.");
  }
  return secret;
}

const SALT_ROUNDS = 10;
const TOKEN_GECERLILIK = "30d";

export async function sifreyiHashle(sifre: string): Promise<string> {
  return bcrypt.hash(sifre, SALT_ROUNDS);
}

export async function sifreyiDogrula(sifre: string, hash: string): Promise<boolean> {
  return bcrypt.compare(sifre, hash);
}

export interface JwtIcerik {
  userId: string;
  email: string;
}

export function tokenOlustur(icerik: JwtIcerik): string {
  return jwt.sign(icerik, getSecret(), { expiresIn: TOKEN_GECERLILIK });
}

export function tokenDogrula(token: string): JwtIcerik | null {
  try {
    return jwt.verify(token, getSecret()) as JwtIcerik;
  } catch {
    return null;
  }
}
