import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

document.title = "DentalConnect - Patient Management System";

createRoot(document.getElementById('root')!).render(
    <App />
)
