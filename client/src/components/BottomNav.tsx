import { BottomNavigation, BottomNavigationAction, Paper, useTheme, useMediaQuery } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from '../useTranslation';

export default function BottomNav() {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();

  if (!isMobile) return null;

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={location.pathname}
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
