import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { registerLicense } from '@syncfusion/ej2-base';
registerLicense('Ngo9BigBOggjGyl/VkN+XU9HcVRAXWFPY1J3WGBZb153flVCal5VT3RfQFtiSH5SdkBjWnpZeHZRRWtfVA==');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
