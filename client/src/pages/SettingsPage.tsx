import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Switch,
  Box,
  List,
  ListItem,
  Paper,
  useTheme,
  IconButton,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  MenuItem,
  Select,
  useMediaQuery
} from '@mui/material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { Play, Store, Moon, Languages, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from '../useTranslation';
import { API_BASE_URL } from '../config';
import { io } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { AppContext } from '../AppContext';
import { cleanStoreName, getStoreLogo } from '../utils/comparisonUtils';
import './SettingsPage.css';
import SettingsCard from '../components/SettingsCard';

const socket = io(API_BASE_URL);

interface Supermarket {
  id: number;
  name: string;
  url: string;
  is_active: number;
  last_scrape_time: string | null;
}

const backgroundOptions = [
  { name: 'monochrome', thumbnail: '/monochrome.webp' },
  { name: 'boho', thumbnail: '/boho.webp' },
  { name: 'cyberpunk', thumbnail: '/cyberpunk.webp' },
  { name: 'lineart', thumbnail: '/lineart.webp' },
  { name: 'nordic', thumbnail: '/nordic.webp' },
  { name: 'oilpainting', thumbnail: '/oilpainting.webp' },
  { name: 'popart', thumbnail: '/popart.webp' },
  { name: 'steampunk', thumbnail: '/steampunk.webp' },
  { name: 'tron', thumbnail: '/tron.webp' },
  { name: 'watercolor', thumbnail: '/watercolor.webp' },
];

const SettingsPage = () => {
  const theme = useTheme();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { toggleColorMode, toggleLanguage, background, setBackground } = useContext(AppContext);

  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [scrapingStates, setScrapingStates] = useState<Record<number, string | null>>({});
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchSupermarkets();

    socket.on('storeStatus', (data: { storeId: number, status: string }) => {
        setScrapingStates(prev => ({ ...prev, [data.storeId]: data.status }));
        if (data.status === 'Done' || data.status.startsWith('Error')) {
            fetchSupermarkets();
        }
    });

    const interval = setInterval(() => {
      setScrapingStates(prev => ({ ...prev }));
    }, 60000);

    return () => {
      socket.off('storeStatus');
      clearInterval(interval);
    };
  }, []);

  const fetchSupermarkets = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/supermarkets`);
    setSupermarkets(res.data.map((s: Supermarket) => ({ ...s, status: null })));
  };

  const handleUpdate = async (id: number, field: string, value: any) => {
    const updated = supermarkets.map(s => s.id === id ? { ...s, [field]: value } : s);
    setSupermarkets(updated);

    const supermarket = updated.find(s => s.id === id);
    if (supermarket) {
      await axios.put(`${API_BASE_URL}/api/supermarkets/${id}`, {
        is_active: supermarket.is_active
      });
    }
  };

  const handleScrapeStore = async (storeId: number) => {
    setScrapingStates(prev => ({ ...prev, [storeId]: 'Starting scrape...' }));
    try {
      await axios.post(`${API_BASE_URL}/api/scrape/${storeId}`);
    } catch (err) {
      console.error(`Error initiating scrape for store ${storeId}:`, err);
      setScrapingStates(prev => ({ ...prev, [storeId]: `Error: ${err.message}` }));
    }
  };

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box className="settings-page-container">
      <Box className="settings-header">
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>{t('settings')}</Typography>
        <Typography variant="body1" color="text.secondary">{t('settingsDescription')}</Typography>
      </Box>

      <Box className="settings-layout">
        <Box className="settings-sidebar">
          <Tabs
            orientation={isMobile ? "horizontal" : "vertical"}
            variant={isMobile ? "fullWidth" : "standard"}
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
                borderInlineEnd: isMobile ? 0 : 1,
                borderBottom: isMobile ? 1 : 0,
                borderColor: 'divider',
                mb: isMobile ? 2 : 0,
                '& .MuiTab-root': {
                    alignItems: isMobile ? 'center' : 'flex-start',
                    textAlign: isMobile ? 'center' : 'left',
                    minHeight: '48px',
                    borderRadius: 1,
                    mb: isMobile ? 0 : 1,
                    px: 2,
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&.Mui-selected': {
                        bgcolor: 'action.selected'
                    }
                }
            }}
          >
            <Tab icon={<Store size={20} />} iconPosition="start" label={language === 'he' ? 'הגדרות חנות' : 'Store settings'} />
            <Tab icon={<Moon size={20} />} iconPosition="start" label={language === 'he' ? 'חזותי' : 'Visual'} />
          </Tabs>
        </Box>

        <Box className="settings-content">
          {activeTab === 0 && (
            <SettingsCard title={language === 'he' ? 'הגדרות חנות' : 'Store Settings'} icon={<Store size={20} />}>
                <List sx={{ p: 0 }}>
                {supermarkets.map((s, index) => (
                    <ListItem
                        key={s.id}
                        sx={{
                        p: { xs: 1.5, sm: 2 },
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                        borderBottom: index < supermarkets.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1, minWidth: 0 }}>
                            <Box sx={{ minWidth: { sm: 160 }, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {getStoreLogo(s.name) ? (
                                    <Box 
                                        component="img" 
                                        src={getStoreLogo(s.name)!} 
                                        alt={s.name}
                                        sx={{ 
                                            height: 36, 
                                            width: '100%', 
                                            maxWidth: 140, 
                                            objectFit: 'contain', 
                                            flexShrink: 0, 
                                            opacity: s.is_active ? 1 : 0.6 
                                        }}
                                    />
                                ) : (
                                    <Typography
                                        variant="h6"
                                        title={s.name}
                                        noWrap
                                        sx={{ fontWeight: 600, fontSize: '1.1rem', opacity: s.is_active ? 1 : 0.6 }}
                                    >
                                        {cleanStoreName(s.name)}
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                minWidth: 0, 
                                flexGrow: 1, 
                                alignItems: { sm: 'flex-end' },
                                px: { sm: 3 } 
                            }}>
                                <Typography 
                                    variant="caption" 
                                    color="text.secondary" 
                                    sx={{ 
                                        opacity: s.is_active ? 0.7 : 0.4,
                                        textAlign: { sm: 'right' }
                                    }}
                                >
                                    {scrapingStates[s.id] && scrapingStates[s.id] !== 'Done' ? (
                                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                            {scrapingStates[s.id] === 'Starting scrape...' && <CircularProgress size={14} />}
                                            {scrapingStates[s.id]}
                                        </Box>
                                    ) : (
                                        s.last_scrape_time ? t('lastScrape', { date: formatDistanceToNow(new Date(s.last_scrape_time), { addSuffix: true, locale: language === 'he' ? he : undefined }) }) : t('neverScraped')
                                    )}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1.5, 
                            width: { xs: '100%', sm: 'auto' },
                            justifyContent: { xs: 'flex-end', sm: 'flex-start' },
                            mt: { xs: 1, sm: 0 }
                        }}>
                            <Tooltip title={language === 'he' ? 'התחל גרידה עבור חנות זו' : 'Start Scrape for This Store'}>
                                <Box component="span" sx={{ display: 'inline-block', bgcolor: theme.palette.mode === 'dark' ? 'rgba(103, 58, 183, 0.1)' : 'rgba(103, 58, 183, 0.05)', borderRadius: '50%' }}>
                                    <IconButton
                                        onClick={() => handleScrapeStore(s.id)}
                                        color="primary"
                                        disabled={!s.is_active || (!!scrapingStates[s.id] && scrapingStates[s.id] !== 'Done' && !scrapingStates[s.id].startsWith('Error'))}
                                    >
                                        {(!!scrapingStates[s.id] && scrapingStates[s.id] !== 'Done' && !scrapingStates[s.id].startsWith('Error')) ? <CircularProgress size={20} /> : <Play size={20} />}
                                    </IconButton>
                                </Box>
                            </Tooltip>

                            <Tooltip title={language === 'he' ? 'הצג נתונים שנאספו' : 'Show Scraped Data'}>
                                <IconButton
                                    onClick={() => navigate(`/scraped-data/${s.id}`)}
                                    color="primary"
                                    sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(103, 58, 183, 0.1)' : 'rgba(103, 58, 183, 0.05)' }}
                                >
                                    <ListAltIcon />
                                </IconButton>
                            </Tooltip>

                            <Switch
                                checked={s.is_active === 1}
                                onChange={(e) => handleUpdate(s.id, 'is_active', e.target.checked ? 1 : 0)}
                                color="primary"
                            />
                        </Box>
                    </ListItem>
                ))}
                </List>
            </SettingsCard>
          )}

          {activeTab === 1 && (
            <Box>
                <SettingsCard title={language === 'he' ? 'הגדרות כלליות' : 'General Settings'}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Moon size={24} />
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{language === 'he' ? 'מצב כהה' : 'Dark Mode'}</Typography>
                                    <Typography variant="caption" color="text.secondary">{language === 'he' ? 'שנה את ערכת הנושא של האפליקציה' : 'Toggle application theme'}</Typography>
                                </Box>
                            </Box>
                            <Switch checked={isDark} onChange={toggleColorMode} color="primary" />
                        </Box>

                        <Divider />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Languages size={24} />
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{language === 'he' ? 'שפה' : 'Language'}</Typography>
                                    <Typography variant="caption" color="text.secondary">{language === 'he' ? 'בחר את שפת הממשק המועדפת עליך' : 'Select your preferred interface language'}</Typography>
                                </Box>
                            </Box>
                            <Select
                                value={language}
                                onChange={(e) => toggleLanguage(e.target.value as string)}
                                sx={{ minWidth: '120px' }}
                            >
                                <MenuItem value="he">עברית</MenuItem>
                                <MenuItem value="en">English</MenuItem>
                            </Select>
                        </Box>
                    </Box>
                </SettingsCard>

                <SettingsCard title={language === 'he' ? 'חזותי' : 'Appearance'} icon={<ImageIcon size={20} />}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {language === 'he' ? 'בחר את הרקע המועדף עליך' : 'Choose your favorite background'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                            {backgroundOptions.map((option) => (
                                <Box
                                    key={option.name}
                                    onClick={() => setBackground(option.name)}
                                    sx={{
                                        cursor: 'pointer',
                                        borderRadius: 2,
                                        border: '3px solid',
                                        borderColor: background === option.name ? 'primary.main' : 'transparent',
                                        overflow: 'hidden',
                                        width: { xs: 'calc(50% - 8px)', sm: 150 },
                                        height: 100,
                                        position: 'relative',
                                        '&:hover': {
                                            borderColor: 'primary.light',
                                        },
                                    }}
                                >
                                    <img src={option.thumbnail} alt={option.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            bgcolor: 'rgba(0,0,0,0.6)',
                                            color: 'white',
                                            textAlign: 'center',
                                            p: 0.5,
                                        }}
                                    >
                                        {t(option.name)}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </SettingsCard>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
export default SettingsPage;