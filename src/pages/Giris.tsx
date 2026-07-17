import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Card, ErrorState, Input, Label } from "../components/ui";

export default function Giris() {
  const { girisYap } = useAuth();
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
        <h1 className="mb-4 text-lg font-semibold text-white">Giriş Yap</h1>
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
