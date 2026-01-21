import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  BottomNavigation, 
  BottomNavigationAction,
  Paper,
  useMediaQuery,
  useTheme,
  IconButton,
  Button,
  Divider,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SettingsIcon from '@mui/icons-material/Settings';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import TranslateIcon from '@mui/icons-material/Translate';
import { AppContext } from './AppContext';
import { useTranslation } from './useTranslation';

import ShoppingListPage from './pages/ShoppingListPage';
import SettingsPage from './pages/SettingsPage';
import ComparisonPage from './pages/ComparisonPage';
import { ScrapedDataPage } from './pages/ScrapedDataPage';

function Navigation() {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();

  if (!isMobile) return null;

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, borderRadius: 0 }} elevation={3}>
      <BottomNavigation
        value={location.pathname}
        showLabels
      >
        <BottomNavigationAction 
          label={t('list')} 
          value="/" 
          icon={<ShoppingCartIcon />} 
          component={Link} 
          to="/" 
        />
        <BottomNavigationAction 
          label={t('compare')} 
          value="/comparison" 
          icon={<CompareArrowsIcon />} 
          component={Link} 
          to="/comparison" 
        />
        <BottomNavigationAction 
          label={t('settings')} 
          value="/settings" 
          icon={<SettingsIcon />} 
          component={Link} 
          to="/settings" 
        />
      </BottomNavigation>
    </Paper>
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
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', color: 'text.primary' }}>
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

          <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, sm: 4, md: 6 }, py: { xs: 3, md: 6 }, position: 'relative', zIndex: 1 }}>
            <Routes>
              <Route path="/" element={<ShoppingListPage />} />
              <Route path="/comparison" element={<ComparisonPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/scraped-data/:id" element={<ScrapedDataPage />} />
            </Routes>
          </Box>

          <Navigation />
        </Box>
    </Router>
  );
}

export default App;