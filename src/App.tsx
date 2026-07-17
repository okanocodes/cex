import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import KorumaliRota from "./components/KorumaliRota";
import Panel from "./pages/Panel";
import Senaryolar from "./pages/Senaryolar";
import SenaryoDetay from "./pages/SenaryoDetay";
import Aramalar from "./pages/Aramalar";
import AramaDetay from "./pages/AramaDetay";
import AramaBaslat from "./pages/AramaBaslat";
import AyarlarSayfasi from "./pages/Ayarlar";
import Giris from "./pages/Giris";
import KayitOl from "./pages/KayitOl";

function App() {
  return (
    <Routes>
      <Route path="/giris" element={<Giris />} />
      <Route path="/kayit-ol" element={<KayitOl />} />
      <Route element={<KorumaliRota />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Panel />} />
          <Route path="/senaryolar" element={<Senaryolar />} />
          <Route path="/senaryolar/yeni" element={<SenaryoDetay />} />
          <Route path="/senaryolar/:id" element={<SenaryoDetay />} />
          <Route path="/aramalar" element={<Aramalar />} />
          <Route path="/aramalar/:id" element={<AramaDetay />} />
          <Route path="/arama-baslat" element={<AramaBaslat />} />
          <Route path="/ayarlar" element={<AyarlarSayfasi />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
