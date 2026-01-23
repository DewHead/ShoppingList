import { useEffect, useMemo, useState } from 'react';
import { 
  Typography, 
  Box, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton, 
  Paper,
  Autocomplete,
  useTheme,
  Tooltip,
  Switch,
  FormControlLabel,
  Collapse
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { PushPin, PushPinOutlined, ExpandMore, ExpandLess } from '@mui/icons-material';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useTranslation } from '../useTranslation';
import { API_BASE_URL } from '../config';
import './ShoppingListPage.css';

const socket = io(API_BASE_URL);

interface ShoppingListItem {
  id: number;
  itemName: string;
  quantity: number;
  itemId: number;
}

interface Item {
  id: number;
  name: string;
  remote_id?: string;
}

interface SearchResult {
  supermarket_id: number;
  supermarket_name: string;
  remote_name: string;
  price: number;
  remote_id: string;
  promo_description?: string;
  branch_info?: string;
  is_pinned?: boolean;
}

interface PinnedItem {
  shopping_list_item_id: number;
  supermarket_id: number;
  remote_id: string;
}

const toHebrew = (str: string) => {
  const map: Record<string, string> = {
    'q': '/', 'w': "'", 'e': 'ק', 'r': 'ר', 't': 'א', 'y': 'ט', 'u': 'ו', 'i': 'ן', 'o': 'ם', 'p': 'פ',
    'a': 'ש', 's': 'ד', 'd': 'ג', 'f': 'כ', 'g': 'ע', 'h': 'י', 'j': 'ח', 'k': 'ל', 'l': 'ך', ';': 'ף', "'": ',',
    'z': 'ז', 'x': 'ס', 'c': 'ב', 'v': 'ה', 'b': 'נ', 'n': 'מ', 'm': 'צ', ',': 'ת', '.': 'ץ', '/': '.'
  };
  return str.split('').map(char => map[char.toLowerCase()] || char).join('');
};

const calculateBestPrice = (match: SearchResult, quantity: number) => {
  const unitPrice = match.price;
  const originalTotal = unitPrice * quantity;
  let bestResult = { total: originalTotal, isPromo: false, originalTotal, displayName: match.remote_name };
  
  if (!match.promo_description) {
      return bestResult;
  }

  const promoList = match.promo_description.split(' | ');
  
  promoList.forEach(promoDesc => {
      const parts = promoDesc.split(/\s+ב-?\s*₪?/);
      if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          const priceMatch = lastPart.match(/^[\d.]+/);
          
          if (priceMatch) {
              const promoPrice = parseFloat(priceMatch[0]);
              const namePart = parts.slice(0, -1).join(' ב ').trim();
              const qtyMatch = namePart.match(/\s(\d+)$/);
              
              let currentTotal = originalTotal;

              if (qtyMatch && parseInt(qtyMatch[1]) > 1) {
                  const requiredQty = parseInt(qtyMatch[1]);
                  const cleanedName = namePart.replace(/\s+\d+$/, '').trim();
                  if (quantity >= requiredQty) {
                      const promoGroups = Math.floor(quantity / requiredQty);
                      const remaining = quantity % requiredQty;
                      currentTotal = (promoGroups * promoPrice) + (remaining * unitPrice);
                      
                      if (currentTotal < bestResult.total) {
                          bestResult = { 
                              total: currentTotal, 
                              isPromo: true, 
                              originalTotal, 
                              displayName: cleanedName || bestResult.displayName 
                          };
                      }
                  }
              } else {
                  const currentTotal = promoPrice * quantity;
                  if (currentTotal < bestResult.total) {
                      bestResult = { 
                          total: currentTotal, 
                          isPromo: true, 
                          originalTotal, 
                          displayName: namePart || bestResult.displayName 
                      };
                  }
              }
          }
      }
  });
  
  return bestResult;
};

const ShoppingListPage = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [notification, setNotification] = useState<string | null>(null);
  const [knownItems, setKnownItems] = useState<Item[]>([]);
  const [storeResults, setStoreResults] = useState<Record<number, any[]>>({});
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [activeSale, setActiveSale] = useState<number | null>(null);
  
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const selectedItems = useMemo(() => items.filter(i => selectedItemIds.includes(i.id)), [items, selectedItemIds]);

  const [itemMatches, setItemMatches] = useState<Record<number, Record<string, SearchResult[]>>>({});
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [expandedStores, setExpandedStores] = useState<string[]>([]);
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const toggleStore = (storeName: string) => {
    setExpandedStores(prev => 
      prev.includes(storeName) 
        ? prev.filter(s => s !== storeName) 
        : [...prev, storeName]
    );
  };

  const toggleAllStores = () => {
    const allStoreNames = Object.keys(groupedMatchesByStore);
    if (expandedStores.length === allStoreNames.length) {
      setExpandedStores([]);
    } else {
      setExpandedStores(allStoreNames);
    }
  };

  const checkIsPinned = (supermarketId: number, remoteId: string, listItemId: number) => {
    return pinnedItems.some(p => 
        String(p.supermarket_id) === String(supermarketId) && 
        String(p.remote_id) === String(remoteId) && 
        String(p.shopping_list_item_id) === String(listItemId)
    );
  };

  const minTotalsPerItem = useMemo(() => {
      const mins: Record<number, number> = {};
      Object.entries(itemMatches).forEach(([itemIdStr, storeMatches]) => {
          const itemId = Number(itemIdStr);
          const item = items.find(i => i.id === itemId);
          if (!item) return;
          
          let min = Infinity;
          Object.values(storeMatches).flat().forEach(m => {
              const { total } = calculateBestPrice(m, item.quantity);
              if (total < min) min = total;
          });
          mins[itemId] = min;
      });
      return mins;
  }, [itemMatches, items]);

  useEffect(() => {
    fetchList();
    fetchKnownItems();
    fetchSupermarkets();
    fetchComparison();
    fetchPinnedItems();

    socket.on('results', (data) => {
      setStoreResults(prev => ({ ...prev, [data.storeId]: data.results }));
    });

    return () => {
      socket.off('results');
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeSale !== null && !(event.target as HTMLElement).closest('.sale-indicator')) {
        setActiveSale(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeSale]);

  const fetchSupermarkets = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/supermarkets`);
    setSupermarkets(res.data);
  };

  const fetchComparison = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/comparison`);
      const formatted: Record<number, any[]> = {};
      Object.entries(res.data).forEach(([id, data]: [string, any]) => {
        formatted[Number(id)] = data.results;
      });
      setStoreResults(formatted);
    } catch (err) {
      console.error('Error fetching comparison:', err);
    }
  };

  const fetchPinnedItems = async () => {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/shopping-list/matches`);
        setPinnedItems(res.data);
    } catch (err) {
        console.error('Error fetching pinned items:', err);
    }
  };

  const fetchList = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/shopping-list`);
    setItems(res.data);
  };

  const fetchKnownItems = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/items`);
    setKnownItems(res.data);
  };

  const handlePinItem = async (shoppingListItemId: number, supermarketId: number, remoteId: string, currentIsPinned: boolean) => {
    try {
        if (currentIsPinned) {
            // Unpin (DELETE)
            await axios.delete(`${API_BASE_URL}/api/shopping-list/match`, {
                params: { shoppingListItemId, supermarketId }
            });
            setNotification("Item unpinned");
        } else {
            // Pin (PUT) - This will overwrite any existing pin for this store/item
            await axios.put(`${API_BASE_URL}/api/shopping-list/match`, {
                shoppingListItemId,
                supermarketId,
                remoteId
            });
            setNotification("Item pinned!");
        }
        
        // Force refresh of both lists to reflect changes immediately
        await Promise.all([
            fetchPinnedItems(),
            fetchComparison()
        ]); 
        
        setTimeout(() => setNotification(null), 3000);
    } catch (err) {
        console.error('Error updating pin:', err);
        setNotification("Error updating pin");
    }
  };

  const addItem = async () => {
    if (!newItemName) return;
    let itemName = newItemName;
    const hebrewConverted = toHebrew(itemName);
    if (hebrewConverted !== itemName && /[\u0590-\u05FF]/.test(hebrewConverted)) {
        itemName = hebrewConverted;
    }
    const existingItem = items.find(item => item.itemName.toLowerCase() === itemName.toLowerCase());
    if (existingItem) {
      const newQuantity = existingItem.quantity + newItemQuantity;
      await updateItemQuantity(existingItem.id, newQuantity);
      setNotification(t('itemUpdated', { itemName }));
      setTimeout(() => setNotification(null), 5000);
    } else {
      await axios.post(`${API_BASE_URL}/api/shopping-list`, { itemName: itemName, quantity: newItemQuantity });
      const listRes = await axios.get(`${API_BASE_URL}/api/shopping-list`);
      const updatedList = listRes.data;
      setItems(updatedList);
      fetchKnownItems();
      if (updatedList.length > 0) {
          const newItem = updatedList.reduce((prev: any, current: any) => (prev.id > current.id) ? prev : current);
          handleItemClick(newItem);
      }
    }
    setNewItemName('');
    setNewItemQuantity(1);
  };

  const removeItem = async (id: number) => {
    setSelectedItemIds(prev => prev.filter(selectedId => selectedId !== id));
    setItemMatches(prev => {
        const newMatches = { ...prev };
        delete newMatches[id];
        return newMatches;
    });
    await axios.delete(`${API_BASE_URL}/api/shopping-list/${id}`);
    fetchList();
  };

  const updateItemQuantity = async (id: number, quantity: number) => {
    if (quantity > 0) {
      await axios.put(`${API_BASE_URL}/api/shopping-list/${id}`, { quantity });
      fetchList();
    }
  };

  const updateItemName = async (id: number, name: string) => {
    let finalName = name;
    const hebrewConverted = toHebrew(finalName);
    if (hebrewConverted !== finalName && /[\u0590-\u05FF]/.test(hebrewConverted)) {
        finalName = hebrewConverted;
    }
    await axios.put(`${API_BASE_URL}/api/shopping-list/${id}`, { itemName: finalName });
    
    // Find the updated item to pass to handleItemClick
    const updatedItem = items.find(i => i.id === id);
    if (updatedItem) {
        handleItemClick({ ...updatedItem, itemName: finalName });
    }

    setEditingId(null);
    fetchList();
    fetchComparison();
  };

  const handleItemClick = async (item: ShoppingListItem) => {
    if (isMultiSelect) {
      if (selectedItemIds.includes(item.id)) {
        setSelectedItemIds(prev => prev.filter(id => id !== item.id));
        return;
      } else {
        setSelectedItemIds(prev => [...prev, item.id]);
      }
    } else {
      setSelectedItemIds([item.id]);
      setItemMatches({}); 
    }

    setLoadingMatches(true);
    try {
        const res = await axios.post(`${API_BASE_URL}/api/search-all-products`, { query: item.itemName });
        const sortedResults = [...res.data].sort((a: SearchResult, b: SearchResult) => {
            const totalA = calculateBestPrice(a, item.quantity).total;
            const totalB = calculateBestPrice(b, item.quantity).total;
            return totalA - totalB;
        });
        const grouped: Record<string, SearchResult[]> = {};
        sortedResults.forEach((r: SearchResult) => {
            if (!grouped[r.supermarket_name]) grouped[r.supermarket_name] = [];
            grouped[r.supermarket_name].push(r);
        });
        setItemMatches(prev => ({ ...prev, [item.id]: grouped }));
    } catch (err) {
        console.error(err);
    } finally {
        setLoadingMatches(false);
    }
  };

  const autocompleteOptions = useMemo(() => {
    const suggestions = new Set<string>();
    Object.values(storeResults).forEach(results => {
      results.forEach(r => {
        suggestions.add(r.item.itemName);
        suggestions.add(r.name);
      });
    });
    return Array.from(suggestions);
  }, [storeResults]);

  const cheapestStore = useMemo(() => {
    let cheapest: any = null;
    let lowestTotal = Infinity;
    const PENALTY_PRICE = 15 * 1.2;

    Object.keys(storeResults).forEach(storeId => {
      const results = storeResults[Number(storeId)];
      if (!results || results.length === 0) return;
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
            if (isNaN(priceVal) || priceVal === 0) isMissing = true;
            else itemPrice = priceVal;
        }
        if (isMissing) {
            missingCount++;
            itemPrice = PENALTY_PRICE * (r.quantity || 1);
        }
        currentTotal += itemPrice;
      });
      if (results.length > 0 && (missingCount / results.length) > 0.40) return;
      if (currentTotal < lowestTotal) {
        lowestTotal = currentTotal;
        const supermarket = supermarkets.find(s => s.id === Number(storeId));
        cheapest = { ...supermarket, total: lowestTotal.toFixed(2), results, missing: missingCount };
      }
    });
    return cheapest;
  }, [storeResults, supermarkets]);

  const groupedMatchesByStore = useMemo(() => {
    const stores: Record<string, { item: ShoppingListItem, matches: SearchResult[] }[]> = {};
    selectedItems.forEach(item => {
      const storeMatches = itemMatches[item.id] || {};
      Object.entries(storeMatches).forEach(([storeName, matches]) => {
        if (!stores[storeName]) stores[storeName] = [];
        stores[storeName].push({ item, matches });
      });
    });
    return stores;
  }, [selectedItems, itemMatches]);

  const getPromoMessage = (promo: string, currentQty: number) => {
    if (!promo) return null;
    const promos = promo.split(' | ');
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {promos.map((p, i) => {
                const countPattern = /^(\d+)\s+ב-?\s*₪?([\d.]+)/;
                const match = p.match(countPattern);
                let message = p;
                if (match) {
                    const requiredQty = parseInt(match[1]);
                    const price = match[2];
                    if (currentQty < requiredQty) {
                        message = `Add ${requiredQty - currentQty} more to get ${requiredQty} for ₪${price}`;
                    }
                }
                return (
                    <Box key={i} sx={{ borderBottom: i < promos.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none', py: 0.5 }}>
                        {message}
                    </Box>
                );
            })}
        </Box>
    );
  };

  const renderMatchItem = (match: SearchResult, item: ShoppingListItem, minTotal: number, isTopMatch: boolean) => {
    const { total, isPromo, originalTotal, displayName } = calculateBestPrice(match, item.quantity);
    const isOverallCheapest = Math.abs(total - minTotal) < 0.01;
    const isStoreCheapest = isTopMatch && !isOverallCheapest;
    
    let priceColor = 'error.main'; 
    if (isOverallCheapest) priceColor = 'success.main';
    else if (isStoreCheapest) priceColor = 'warning.main';

    const currentBestMatchForStore = storeResults[match.supermarket_id]?.find((r: any) => String(r.item.id) === String(item.id));
    
    const isPinned = !!currentBestMatchForStore?.is_pinned && 
                     String(currentBestMatchForStore.remote_id) === String(match.remote_id);
    
    return (
        <ListItem key={`${match.supermarket_id}-${match.remote_id}-${item.id}`} disableGutters sx={{ py: 0.5 }}>
            <ListItemText 
                primary={
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: '1.1rem' }}>
                                {displayName}
                            </Typography>
                            {match.promo_description && (() => {
                                const isSbox = match.promo_description.includes('SBOX');
                                if (!isSbox) return true;
                                const storeSetting = localStorage.getItem(`showCreditCardPromos_${match.supermarket_id}`);
                                return storeSetting ? JSON.parse(storeSetting) : false;
                            })() && (
                                <Tooltip title={getPromoMessage(match.promo_description, item.quantity)} arrow placement="top">
                                    <Box sx={{ display: 'inline-flex', color: 'primary.main', cursor: 'help' }}><AlertCircle size={18} /></Box>
                                </Tooltip>
                            )}
                        </Box>
                        {displayName !== match.remote_name && (
                            <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.95rem', lineHeight: 1.1 }}>
                                {match.remote_name}
                            </Typography>
                        )}
                    </Box>
                } 
                primaryTypographyProps={{ component: 'div' }}
            />
            <Box sx={{ textAlign: 'right', ml: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <IconButton 
                    size="small" 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        handlePinItem(item.id, match.supermarket_id, match.remote_id, isPinned); 
                    }}
                    color={isPinned ? "primary" : "default"}
                    sx={{ p: 0.5 }}
                >
                    {isPinned ? <PushPin fontSize="small" /> : <PushPinOutlined fontSize="small" />}
                </IconButton>
                <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', fontSize: '0.95rem' }}>
                    ₪{match.price.toFixed(2)}
                </Typography>
                <Box sx={{ minWidth: '75px' }}>
                    {isPromo && (
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', display: 'block', fontSize: '0.95rem', lineHeight: 1 }}>
                            ₪{originalTotal.toFixed(2)}
                        </Typography>
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 700, color: priceColor, fontSize: '1.25rem' }}>
                        ₪{total.toFixed(2)}
                    </Typography>
                </Box>
            </Box>
        </ListItem>
    );
  };

  const hasSidePanel = !!cheapestStore || selectedItemIds.length > 0;

  return (
    <Box 
        dir="rtl"
        sx={hasSidePanel ? { 
            display: 'grid', 
            gridTemplateColumns: { md: '320px 400px' }, 
            gap: 12, 
            justifyContent: 'center', 
            mx: 'auto' 
        } : { 
            maxWidth: '600px', 
            mx: 'auto' 
        }}
    >
      {/* Side Panel (Now on the right in RTL grid, which visually is the LEFT side) */}
      <Box dir="ltr" sx={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {selectedItemIds.length > 0 && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: theme.palette.background.paper, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontSize: '1.4rem', fontWeight: 600 }}>
                        {selectedItems.length === 1 ? `${t('matchesFor') || 'Matches for'} "${selectedItems[0].itemName}"` : `${t('matchesFor') || 'Matches for'} ${selectedItems.length} items`}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" onClick={toggleAllStores} sx={{ minWidth: 'auto', px: 1 }}>{expandedStores.length === Object.keys(groupedMatchesByStore).length ? <ExpandLess /> : <ExpandMore />}</Button>
                        <IconButton size="small" onClick={() => { setSelectedItemIds([]); setItemMatches({}); }}><DeleteIcon sx={{ fontSize: '1.4rem' }} /></IconButton>
                    </Box>
                </Box>
                {loadingMatches ? <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1.1rem' }}>Loading...</Typography> : Object.keys(groupedMatchesByStore).length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1.1rem' }}>No matches found.</Typography> : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {Object.entries(groupedMatchesByStore).map(([storeName, itemsWithMatches]) => {
                            const isExpanded = expandedStores.includes(storeName);
                            return (
                                <Box key={storeName} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                                    <Box onClick={() => toggleStore(storeName)} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 1, '&:hover': { opacity: 0.8 } }}>
                                        <IconButton size="small" sx={{ p: 0, mr: 1 }}>{isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</IconButton>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontSize: '1.2rem', flexGrow: 1 }}>{storeName}</Typography>
                                    </Box>
                                    {!isExpanded && (
                                        <Box sx={{ pl: 1 }}>
                                            <List dense disablePadding>
                                                {itemsWithMatches.map(({ item, matches }) => {
                                                    const bestMatch = matches[0];
                                                    return bestMatch ? renderMatchItem(bestMatch, item, minTotalsPerItem[item.id], true) : null;
                                                })}
                                            </List>
                                        </Box>
                                    )}
                                    <Collapse in={isExpanded} timeout="auto">
                                        <Box sx={{ pl: 1 }}>
                                            {itemsWithMatches.map(({ item, matches }) => (
                                                <Box key={item.id} sx={{ mb: itemsWithMatches.length > 1 ? 2 : 0, pl: itemsWithMatches.length > 1 ? 1 : 0, borderLeft: itemsWithMatches.length > 1 ? '2px solid rgba(103, 58, 183, 0.2)' : 'none' }}>
                                                    {selectedItems.length > 1 && <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8, color: 'primary.main', fontSize: '1.05rem' }}>{item.itemName} ({item.quantity})</Typography>}
                                                    <List dense disablePadding>
                                                        {(selectedItems.length > 1 ? matches.slice(0, 1) : matches).map((match, idx) => renderMatchItem(match, item, minTotalsPerItem[item.id], idx === 0))}
                                                    </List>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Collapse>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Paper>
          )}

          {cheapestStore && selectedItemIds.length === 0 && (
            <Paper elevation={0} sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1, fontSize: '1.4rem' }}>{t('cheapestStore')}</Typography>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>{cheapestStore.name}</Typography>
                  {cheapestStore.missing > 0 && <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>* {cheapestStore.missing} items missing (estimated)</Typography>}
                </Box>
                <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 800, fontSize: '2rem' }}>₪{cheapestStore.total}</Typography>
              </Box>
              <List sx={{ p: 0 }}>
                {cheapestStore.results.map((r: any, i: number) => (
                  <ListItem key={i} sx={{ px: 0, py: 1 }} divider={i < cheapestStore.results.length - 1}>
                    <ListItemText primary={<Box sx={{ display: 'flex', alignItems: 'center' }}><Typography sx={{ fontSize: '1.1rem', fontWeight: 600 }}>{r.item.itemName}</Typography>{r.saleDetails && <span className="sale-indicator" onClick={() => setActiveSale(activeSale === i ? null : i)}><span className="exclamation-mark">!</span>{activeSale === i && <div className="sale-popup">{r.saleDetails}</div>}</span>}</Box>} secondary={r.name} secondaryTypographyProps={{ noWrap: true, variant: 'caption', sx: { fontSize: '0.9rem' } }} />
                    <Typography variant="body1" sx={{ fontWeight: 700, ml: 2, textAlign: 'right', fontSize: '1.1rem' }}>{r.price}</Typography>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
      </Box>

      {/* Main List (Now on the left in RTL grid, which visually is the RIGHT side) */}
      <Box dir="ltr" sx={{ textAlign: 'left' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, fontSize: '2.5rem' }}>{t('myList')}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.2rem' }}>{t('myListDescription')}</Typography>
        </Box>
        
        <Paper elevation={0} sx={{ p: 2, mb: 5, display: 'flex', gap: 2, alignItems: 'center', backgroundColor: theme.palette.mode === 'dark' ? 'rgba(40, 40, 40, 0.7)' : 'rgba(103, 58, 183, 0.15)' }}>
          <Autocomplete
            freeSolo
            options={autocompleteOptions}
            sx={{ flexGrow: 1 }}
            value={newItemName}
            onInputChange={(_, newInputValue) => setNewItemName(newInputValue)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            renderInput={(params) => <TextField {...params} placeholder={t('addItemPlaceholder')} variant="outlined" size="small" inputProps={{ ...params.inputProps, style: { fontSize: '1.2rem' } }} />}
          />
          <TextField type="number" value={newItemQuantity} onChange={(e) => setNewItemQuantity(Number(e.target.value))} onKeyDown={(e) => e.key === 'Enter' && addItem()} sx={{ width: '80px' }} size="small" inputProps={{ min: 1, style: { fontSize: '1.2rem' } }} />
          <Button variant="contained" onClick={addItem} sx={{ py: 1.2, px: 4, fontSize: '1.2rem' }}>{t('add')}</Button>
        </Paper>

        {notification && (
          <Box sx={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0, 0, 0, 0.8)', color: 'white', padding: '10px 20px', borderRadius: '8px', zIndex: 1500, animation: 'fadeInOut 5s forwards', overflow: 'hidden' }}>
            {notification}
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.5)', animation: 'countdown 5s linear forwards' }}/>
          </Box>
        )}

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ m: 0, fontSize: '1.6rem' }}>{t('itemsInCart')}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isMultiSelect && <Button size="small" variant="text" onClick={() => { setSelectedItemIds(items.map(i => i.id)); items.forEach(i => !itemMatches[i.id] && handleItemClick(i)); }} sx={{ fontSize: '1rem', py: 0 }}>Select All</Button>}
                <FormControlLabel control={<Switch size="small" checked={isMultiSelect} onChange={(e) => { setIsMultiSelect(e.target.checked); if (!e.target.checked) { setSelectedItemIds([]); setItemMatches({}); } }} />} label={<Typography variant="caption" sx={{ fontSize: '1rem' }}>Multi-Select</Typography>} />
            </Box>
          </Box>
          <Paper elevation={0}>
            <List sx={{ p: 0 }} dense>
              {items.map((item, index) => (
                <ListItem key={item.id} divider={index < items.length - 1} selected={selectedItemIds.includes(item.id)} onClick={() => handleItemClick(item)} sx={{ px: 2, py: 1, bgcolor: selectedItemIds.includes(item.id) ? (theme.palette.mode === 'dark' ? 'rgba(90, 90, 90, 0.5)' : 'rgba(103, 58, 183, 0.25)') : (theme.palette.mode === 'dark' ? 'rgba(40, 40, 40, 0.7)' : 'rgba(103, 58, 183, 0.15)'), cursor: 'pointer', transition: 'background-color 0.2s', '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(60, 60, 60, 0.7)' : 'rgba(103, 58, 183, 0.2)' } }}>
                  {editingId === item.id ? (
                      <TextField
                        size="small"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') updateItemName(item.id, editingName);
                            if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        sx={{ flexGrow: 1, mr: 2 }}
                        inputProps={{ style: { fontWeight: 600, fontSize: '1.3rem' } }}
                      />
                  ) : (
                    <ListItemText primary={item.itemName} primaryTypographyProps={{ fontWeight: 600, fontSize: '1.3rem' }} sx={{ m: 0 }} />
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                    <TextField type="number" value={item.quantity} onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))} onClick={(e) => e.stopPropagation()} sx={{ width: '60px' }} size="small" inputProps={{ min: 1, style: { padding: '4px 6px', fontSize: '1.2rem', textAlign: 'center' } }} />
                    {editingId === item.id ? (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); updateItemName(item.id, editingName); }} color="primary">
                            <SaveIcon sx={{ fontSize: '1.6rem' }} />
                        </IconButton>
                    ) : (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditingName(item.itemName); }} sx={{ color: 'text.secondary' }}>
                            <EditIcon sx={{ fontSize: '1.6rem' }} />
                        </IconButton>
                    )}
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' }}}><DeleteIcon sx={{ fontSize: '1.6rem' }} /></IconButton>
                  </Box>
                </ListItem>
              ))}
              {items.length === 0 && <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">{t('emptyList')}</Typography></Box>}
            </List>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ShoppingListPage;
