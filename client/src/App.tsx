import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  useMediaQuery,
  useTheme,
  IconButton,
  Button,
  Divider,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import TranslateIcon from '@mui/icons-material/Translate';
import { AppContext } from './AppContext';
import { useTranslation } from './useTranslation';
import BottomNav from './components/BottomNav';

import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';

const ShoppingListPage = React.lazy(() => import('./pages/ShoppingListPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ComparisonPage = React.lazy(() => import('./pages/ComparisonPage'));
const ScrapedDataPage = React.lazy(() => import('./pages/ScrapedDataPage').then(module => ({ default: module.ScrapedDataPage })));

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <React.Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="text.secondary">Loading...</Typography>
      </Box>
    }>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><ShoppingListPage /></PageTransition>} />
          <Route path="/comparison" element={<PageTransition><ComparisonPage /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          <Route path="/scraped-data/:id" element={<PageTransition><ScrapedDataPage /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </React.Suspense>
  );
}

function DesktopNavigationButtons() {
  const location = useLocation();
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
      {[
        { label: t('list'), path: '/' },
        { label: t('compare'), path: '/comparison' },
        { label: t('settings'), path: '/settings' }
      ].map((item, index) => {
        const isActive = location.pathname === item.path;
        return (
          <React.Fragment key={item.path}>
            <Button 
              component={Link} 
              to={item.path}
              sx={{ 
                fontSize: '1.1rem',
                color: isActive ? 'text.primary' : 'text.secondary',
                fontWeight: isActive ? 700 : 500,
                bgcolor: isActive ? (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)') : 'transparent',
                '&:hover': {
                  color: 'text.primary',
                  bgcolor: isActive ? (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)') : 'action.hover',
                  border: '2px solid transparent'
                }
              }}
            >
              {item.label}
            </Button>
            {index < 2 && <Divider orientation="vertical" flexItem />}
          </React.Fragment>
        );
      })}              </Box>
  );
}

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { toggleColorMode, toggleLanguage } = useContext(AppContext);
  const { t, language } = useTranslation();

  useEffect(() => {
    document.body.className = theme.palette.mode === 'dark' ? 'dark-mode' : '';
    document.dir = language === 'he' ? 'rtl' : 'ltr';
  }, [theme.palette.mode, language]);

  return (
    <Router>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', color: 'text.primary', pb: isMobile ? '56px' : 0 }}>
          <AppBar position="sticky" elevation={0} sx={{ 
            bgcolor: (theme) => theme.palette.background.paper,
            backdropFilter: 'blur(2px)' 
          }}>
             <Toolbar sx={{ px: { xs: 2, sm: 4 } }}>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                <ShoppingCartIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: 'text.primary'
                }}>
                  {t('smartCart')}
                </Typography>
              </Box>
              
              {!isMobile && <DesktopNavigationButtons />}
              
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: { xs: 1, sm: 2 } }}>
                <IconButton onClick={toggleColorMode} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                  {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
                <IconButton onClick={toggleLanguage} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                  <TranslateIcon />
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          <Box component="main" sx={{ 
            flexGrow: 1, 
            px: { xs: 1, sm: 4, md: 8, lg: 12 }, 
            py: { xs: 2, md: 4 }, 
            position: 'relative', 
            zIndex: 1,
            maxWidth: '1600px',
            margin: '0 auto',
            width: '100%'
          }}>
            <AnimatedRoutes />
          </Box>

          <BottomNav />
        </Box>
    </Router>
  );
}

export default App;