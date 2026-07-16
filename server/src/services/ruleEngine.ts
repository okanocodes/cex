import type { Senaryo, SenaryoKural } from "../types.js";

export function kuralEslestir(senaryo: Senaryo, kullaniciMetni: string): SenaryoKural | null {
  const metin = kullaniciMetni.toLocaleLowerCase("tr-TR");
  for (const kural of senaryo.kurallar) {
    const eslesti = kural.anahtar_kelimeler.some((kw) => metin.includes(kw.toLocaleLowerCase("tr-TR")));
    if (eslesti) return kural;
  }
  return null;
}
