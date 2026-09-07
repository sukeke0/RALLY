import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from './page';
import {LanguageProvider} from '../i18n/context';
import './globals.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><LanguageProvider><Home/></LanguageProvider></React.StrictMode>);
