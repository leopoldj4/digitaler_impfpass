import { Routes, Route } from 'react-router-dom'
import MobileFrame from './components/MobileFrame'
import Home from './pages/Home'
import Upload from './pages/Upload'
import Overview from './pages/Overview'
import Share from './pages/Share'
import Termin from './pages/Termin'
import Wallet from './pages/Wallet'

export default function App() {
  return (
    <MobileFrame>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/share" element={<Share />} />
        <Route path="/termin" element={<Termin />} />
        <Route path="/wallet" element={<Wallet />} />
      </Routes>
    </MobileFrame>
  )
}
