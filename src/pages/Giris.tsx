import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Card, ErrorState, Input, Label } from "../components/ui";

const DEMO_EMAIL = "demo@cex.app";
const DEMO_SIFRE = "demo12345";

export default function Giris() {
  const { girisYap, kayitOl } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);
    try {
      await girisYap(email, sifre);
      navigate("/");
    } catch (err) {
      setHata((err as Error).message);
    } finally {
      setYukleniyor(false);
    }
  };

  const demoIleGirisYap = async () => {
    setEmail(DEMO_EMAIL);
    setSifre(DEMO_SIFRE);
    setHata(null);
    setYukleniyor(true);
    try {
      try {
        await girisYap(DEMO_EMAIL, DEMO_SIFRE);
      } catch {
        // Demo hesabı henüz yoksa (taze veritabanı) otomatik oluştur ve o oturumla devam et.
        await kayitOl(DEMO_EMAIL, DEMO_SIFRE);
      }
      navigate("/");
    } catch (err) {
      setHata((err as Error).message);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
            C
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-white">CEX</p>
            <p className="text-xs text-slate-400">AI Çağrı Platformu</p>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Giriş Yap</h1>
          <button
            type="button"
            onClick={demoIleGirisYap}
            disabled={yukleniyor}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            Demo Kullanıcı
          </button>
        </div>
        <form className="flex flex-col gap-4" onSubmit={gonder}>
          <div>
            <Label>E-posta</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="siz@ornek.com" />
          </div>
          <div>
            <Label>Şifre</Label>
            <Input type="password" required value={sifre} onChange={(e) => setSifre(e.target.value)} />
          </div>
          {hata && <ErrorState message={hata} />}
          <Button type="submit" disabled={yukleniyor}>
            {yukleniyor ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Hesabınız yok mu?{" "}
          <Link to="/kayit-ol" className="font-medium text-indigo-400 hover:text-indigo-300">
            Kayıt Ol
          </Link>
        </p>
      </Card>
    </div>
  );
}
