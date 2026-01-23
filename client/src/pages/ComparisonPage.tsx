import { useState, useEffect, useCallback, useContext } from 'react';
import { 
  Typography, 
  Box, 
  Button, 
  CircularProgress, 
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  useTheme,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CloseIcon from '@mui/icons-material/Close';
import { AlertCircle } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useTranslation } from '../useTranslation';
import { API_BASE_URL } from '../config';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { AppContext } from '../AppContext';
import './ComparisonPage.css';

const socket = io(API_BASE_URL);

const ComparisonPage = () => {
  const theme = useTheme();
  const { t, language } = useTranslation();
  const { showCreditCardPromos } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [storeStatuses, setStoreStatuses] = useState<Record<number, string>>({});
  const [storeResults, setStoreResults] = useState<Record<number, any>>({});
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeCoupons, setActiveCoupons] = useState<{ storeName: string, coupons: any[] } | null>(null);
  const [localShoppingListItems, setLocalShoppingListItems] = useState<any[]>([]);
  const [, setTick] = useState(0); 
  const [hideCoupons, setHideCoupons] = useState(false);


  const fetchSupermarkets = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/supermarkets`);
      setSupermarkets(res.data);
    } catch (err) {
      console.error('Error fetching supermarkets:', err);
    }
  }, []);

  const fetchShoppingList = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/shopping-list`);
      setLocalShoppingListItems(res.data);
    } catch (err) {
      console.error('Error fetching shopping list:', err);
      setError('Failed to load shopping list');
    }
  }, []);

  const fetchComparisonData = useCallback(async (showCreditCardPromos) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/comparison`, {
        params: { showSbox: showCreditCardPromos }
      });
      setStoreResults(res.data);
    } catch (err) {
      console.error('Error fetching comparison data:', err);
    }
  }, []);

  useEffect(() => {
    fetchSupermarkets();
    fetchShoppingList();
    fetchComparisonData(showCreditCardPromos);

    socket.on('status', (data) => {
      setStoreStatuses(prev => ({ ...prev, [data.storeId]: data.status }));
    });

    socket.on('results', (data) => {
      setStoreStatuses(prev => ({ ...prev, [data.storeId]: 'Done' }));
      fetchComparisonData(showCreditCardPromos); 
      fetchSupermarkets(); 
      setLoading(false);
    });

    const interval = setInterval(() => setTick(t => t + 1), 60000);

    return () => {
      socket.off('status');
      socket.off('results');
      clearInterval(interval);
    };
  }, [fetchSupermarkets, fetchShoppingList, fetchComparisonData, showCreditCardPromos]);

  const startComparison = async () => {
    setLoading(true);
    setError(null);
    const activeStoreIds = supermarkets.filter(s => s.is_active).map(s => s.id);
    const newStatuses = { ...storeStatuses };
    activeStoreIds.forEach(id => newStatuses[id] = 'Starting...');
    setStoreStatuses(newStatuses);

    setActiveCoupons(null);
    try {
      await axios.post(`${API_BASE_URL}/api/scrape`);
    } catch (err: any) {
      setError('Failed to start comparison');
      setLoading(false);
    }
  };

  const getLastRefreshText = () => {
    if (loading) return null;

    const activeSupermarkets = supermarkets.filter(s => s.is_active && s.last_scrape_time);
    if (activeSupermarkets.length === 0) return null;

    const latestScrape = activeSupermarkets.reduce((latest, s) => {
      const current = new Date(s.last_scrape_time).getTime();
      return current > latest ? current : latest;
    }, 0);

    if (latestScrape === 0) return null;

    const timeAgo = formatDistanceToNow(latestScrape, { 
      addSuffix: true, 
      locale: language === 'he' ? he : undefined 
    });

    return `${language === 'he' ? 'עודכן' : 'Updated'} ${timeAgo}`;
  };

  const calculateSmartTotal = (results: any[]) => {
    if (!results) return { total: '0.00', missing: 0, isValid: false };
    
    const PENALTY_PRICE = 15 * 1.2;
    let currentTotal = 0;
    let missingCount = 0;

    results.forEach((r: any) => {
      let itemPrice = 0;
      let isMissing = false;

      const priceStr = String(r.price);
      if (priceStr === 'N/A' || priceStr === 'NA' || r.rawPrice === 0) {
          isMissing = true;
      } else {
          const priceVal = parseFloat(priceStr.replace(/[^\d.]/g, ''));
          if (isNaN(priceVal) || priceVal === 0) {
              isMissing = true;
          } else {
              itemPrice = priceVal;
          }
      }

      if (isMissing) {
          missingCount++;
          itemPrice = PENALTY_PRICE * (r.quantity || 1);
      }

      currentTotal += itemPrice;
    });

    const isValid = results.length > 0 && (missingCount / results.length) <= 0.40;
    return { 
      total: currentTotal.toFixed(2), 
      missing: missingCount, 
      isValid 
    };
  };

  const isDark = theme.palette.mode === 'dark';

  const hasCoupons = Object.values(storeResults).some(store => 
    store.results?.some((r: any) => r.promo_description?.includes('קופון'))
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 1 }}>{t('priceComparison')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('priceComparisonDescription')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Button 
            variant="contained" 
            onClick={startComparison}
            disabled={loading}
            sx={{ py: 1.5, px: 4, borderRadius: 2, fontWeight: 600 }}
            >
            {loading ? t('refreshing') : t('refreshPrices')}
            </Button>
            {getLastRefreshText() && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {getLastRefreshText()}
                </Typography>
            )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title={!hasCoupons ? t('noCouponsTooltip') : ""}>
            <span>
              <FormControlLabel
                control={
                  <Switch
                    checked={hideCoupons}
                    onChange={(e) => setHideCoupons(e.target.checked)}
                    disabled={!hasCoupons}
                  />
                }
                label={t('hideCoupons')}
              />
            </span>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
        {supermarkets.filter(s => s.is_active).map(s => {
          const results = storeResults[s.id]?.results;
          let filteredResults = results;
          if (hideCoupons) {
            filteredResults = filteredResults?.filter((r: any) => !r.promo_description?.includes('קופון'));
          }
          if (!showCreditCardPromos) {
            filteredResults = filteredResults?.filter((r: any) => !r.promo_description?.includes('SBOX'));
          }

          const smartData = calculateSmartTotal(filteredResults);

          return (
          <Paper 
            key={s.id} 
            elevation={0} 
            sx={{ 
                p: 2, 
                transition: 'transform 0.2s', 
                '&:hover': { transform: 'translateY(-2px)' },
                opacity: smartData.isValid ? 1 : 0.6,
                border: !smartData.isValid ? '1px dashed rgba(255,0,0,0.3)' : 'none'
            }}
          >
            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <ListItemText 
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
                        {s.name}
                    </Typography>
                    <span 
                      className={
                        `coupon-indicator ${storeResults[s.id]?.coupons?.length > 0 ? 'coupon-icon-active' : 'coupon-icon-inactive'}`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (storeResults[s.id]?.coupons?.length > 0) {
                          setActiveCoupons({ storeName: s.name, coupons: storeResults[s.id].coupons });
                        }
                      }}
                    >
                      <LocalOfferIcon sx={{ fontSize: '1rem' }} />
                    </span>
                  </Box>
                }
                secondary={
                    <Box>
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.7, fontSize: '0.8rem' }}>
                            {storeStatuses[s.id] || (s.last_scrape_time ? t('ready') : t('ready'))}
                        </Typography>
                        {smartData.missing > 0 && (
                            <Typography variant="caption" color="error" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                * {smartData.missing} items missing
                            </Typography>
                        )}
                        {!smartData.isValid && filteredResults?.length > 0 && (
                            <Typography variant="caption" color="error" sx={{ fontWeight: 700, display: 'block', fontSize: '0.7rem' }}>
                                (Too many missing items)
                            </Typography>
                        )}
                    </Box>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
              <Typography variant="h6" sx={{ fontWeight: 800, color: smartData.isValid ? 'primary.main' : 'text.disabled', fontSize: '1.4rem' }}>
                {filteredResults ? `₪${smartData.total}` : '--.--'}
              </Typography>
            </Box>
            <List sx={{ p: 0 }} dense>
              {filteredResults ? (
                filteredResults.map((r: any, i: number) => (
                  <ListItem 
                    key={i} 
                    sx={{ 
                      px: 0, 
                      py: 0.8,
                      backgroundColor: (r.price === 'N/A' || r.price === 'NA' || (r.name && r.name.toLowerCase().includes('not found'))) ? 'rgba(255, 0, 0, 0.05)' : 'transparent'
                    }} 
                    divider={i < filteredResults.length - 1}
                  >
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.2, color: (r.price === 'N/A' || r.price === 'NA') ? 'text.disabled' : 'text.primary' }}>
                                {r.item.itemName}
                            </Typography>
                            {r.promo_description && (
                                <Tooltip title={<Box sx={{ direction: 'rtl', textAlign: 'right' }}>{r.promo_description}</Box>} arrow placement="top">
                                    <Box sx={{ display: 'inline-flex', color: 'primary.main', cursor: 'help' }}>
                                        <AlertCircle size={14} />
                                    </Box>
                                </Tooltip>
                            )}
                        </Box>
                      } 
                      primaryTypographyProps={{ component: 'div' }}
                      secondary={r.name}
                      secondaryTypographyProps={{ noWrap: true, variant: 'caption', sx: { fontSize: '0.8rem', opacity: 0.6 } }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700, ml: 1, textAlign: 'right', whiteSpace: 'nowrap', fontSize: '1rem', color: (r.price === 'N/A' || r.price === 'NA') ? 'error.main' : 'text.primary' }}>
                        {r.price}
                    </Typography>
                  </ListItem>
                ))
              ) : (
                <ListItem sx={{ p: 3, textAlign: 'center' }}>
                  <ListItemText primaryTypographyProps={{ color: 'text.secondary', variant: 'body2', sx: { fontStyle: 'italic', fontSize: '0.9rem' } }}>
                    {t('getDataForStore')}
                  </ListItemText>
                </ListItem>
              )}
            </List>
          </Paper>
        )})}
      </Box>

      {activeCoupons && (
        <Paper className={`coupon-popup ${isDark ? 'coupon-popup-dark' : ''}`} elevation={8}>
          <IconButton
            aria-label="close"
            onClick={() => setActiveCoupons(null)}
            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 700 }}>
            {t('couponsFor')} {activeCoupons.storeName}
          </Typography>
          <List className="coupon-list">
            {activeCoupons.coupons.map((coupon, index) => (
              <ListItem key={index} sx={{ display: 'block', p: 1.5, mb: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{coupon.description}</Typography>
                {coupon.link && (
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    <a href={coupon.link} target="_blank" rel="noopener noreferrer" style={{ color: theme.palette.primary.main }}>{coupon.link}</a>
                  </Typography>
                )}
              </ListItem>
            ))}
          </List>
          {activeCoupons.coupons.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              {t('noActiveCoupons')}
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default ComparisonPage;
