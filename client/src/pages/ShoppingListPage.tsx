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
  Switch,
  FormControlLabel,
  SwipeableDrawer,
  useTheme,
  useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';
import UndoIcon from '@mui/icons-material/Undo';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
  LeadingActions,
  Type as SwipeType,
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import axios from 'axios';
import { Virtuoso } from 'react-virtuoso';
import { io } from 'socket.io-client';
import { useTranslation } from '../useTranslation';
import { API_BASE_URL } from '../config';
import AddItemFAB from '../components/AddItemFAB';
import ShoppingListSidePanel from '../components/ShoppingListSidePanel';
import { calculateBestPrice, cleanStoreName, getStoreLogo } from '../utils/comparisonUtils';
import './ShoppingListPage.css';

const socket = io(API_BASE_URL);

interface ShoppingListItem {
  id: number;
  itemName: string;
  quantity: number;
  itemId: number;
  is_done?: number | boolean;
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

const toHebrew = (str: string) => {
  const map: Record<string, string> = {
    'q': '/', 'w': "'", 'e': 'ק', 'r': 'ר', 't': 'א', 'y': 'ט', 'u': 'ו', 'i': 'ן', 'o': 'ם', 'p': 'פ',
    'a': 'ש', 's': 'ד', 'd': 'ג', 'f': 'כ', 'g': 'ע', 'h': 'י', 'j': 'ח', 'k': 'ל', 'l': 'ך', ';': 'ף', "'": ',',
    'z': 'ז', 'x': 'ס', 'c': 'ב', 'v': 'ה', 'b': 'נ', 'n': 'מ', 'm': 'צ', ',': 'ת', '.': 'ץ', '/': '.'
  };
  return str.split('').map(char => map[char.toLowerCase()] || char).join('');
};

const ShoppingListPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [storeResults, setStoreResults] = useState<Record<number, any[]>>({});
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [activeSale, setActiveSale] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const selectedItems = useMemo(() => items.filter(i => selectedItemIds.includes(i.id)), [items, selectedItemIds]);

  const [itemMatches, setItemMatches] = useState<Record<number, Record<string, SearchResult[]>>>({});
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [expandedStores, setExpandedStores] = useState<string[]>([]);

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
    fetchSupermarkets();
    fetchComparison();

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

  const fetchList = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/shopping-list`);
    setItems(res.data);
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
            fetchComparison()
        ]); 
        
        setTimeout(() => setNotification(null), 3000);
    } catch (err) {
        console.error('Error updating pin:', err);
        setNotification("Error updating pin");
    }
  };

  const addItem = async (name: string, quantity: number) => {
    if (!name) return;
    let itemName = name;
    const hebrewConverted = toHebrew(itemName);
    if (hebrewConverted !== itemName && /[\u0590-\u05FF]/.test(hebrewConverted)) {
        itemName = hebrewConverted;
    }
    const existingItem = items.find(item => item.itemName.toLowerCase() === itemName.toLowerCase());
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      await updateItemQuantity(existingItem.id, newQuantity);
      setNotification(t('itemUpdated', { itemName }));
      setTimeout(() => setNotification(null), 5000);
    } else {
      await axios.post(`${API_BASE_URL}/api/shopping-list`, { itemName: itemName, quantity: quantity });
      const listRes = await axios.get(`${API_BASE_URL}/api/shopping-list`);
      const updatedList = listRes.data;
      setItems(updatedList);
      if (updatedList.length > 0) {
          const newItem = updatedList.reduce((prev: any, current: any) => (prev.id > current.id) ? prev : current);
          handleItemClick(newItem);
      }
    }
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

  const toggleItemDone = async (item: ShoppingListItem) => {
    await axios.put(`${API_BASE_URL}/api/shopping-list/${item.id}`, { is_done: !item.is_done });
    fetchList();
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

  const clearSelection = () => {
    setSelectedItemIds([]);
    setItemMatches({});
  };

  const hasSidePanel = !!cheapestStore || selectedItemIds.length > 0;

  return (
    <Box 
        data-testid="shopping-list-container"
        sx={(!isMobile && hasSidePanel) ? { 
            display: 'grid', 
            gridTemplateColumns: { md: '1.6fr 1fr' }, 
            gap: { xs: 3, md: 6 }, 
            maxWidth: '1400px',
            mx: 'auto',
            pb: 10 // Extra padding for FAB
        } : { 
            maxWidth: '800px', 
            mx: 'auto',
            pb: (isMobile && hasSidePanel) ? 20 : 10 // Extra padding for FAB + Summary Bar
        }}
    >
      {/* Main List */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>{t('myList')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('myListDescription')}</Typography>
        </Box>
        
        {notification && (
          <Box sx={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0, 0, 0, 0.8)', color: 'white', padding: '10px 20px', borderRadius: '8px', zIndex: 1500, animation: 'fadeInOut 5s forwards', overflow: 'hidden' }}>
            {notification}
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.5)', animation: 'countdown 5s linear forwards' }}/>
          </Box>
        )}

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('itemsInCart')}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isMultiSelect && <Button size="small" variant="text" onClick={() => { setSelectedItemIds(items.map(i => i.id)); items.forEach(i => !itemMatches[i.id] && handleItemClick(i)); }}>Select All</Button>}
                <FormControlLabel control={<Switch size="small" checked={isMultiSelect} onChange={(e) => { setIsMultiSelect(e.target.checked); if (!e.target.checked) { setSelectedItemIds([]); setItemMatches({}); } }} />} label={<Typography variant="caption">Multi-Select</Typography>} />
            </Box>
          </Box>
          <Paper sx={{ overflow: 'hidden' }}>
            <Virtuoso
              style={{ height: '400px' }}
              data={items}
              itemContent={(index, item) => {
                const isSelected = selectedItemIds.includes(item.id);
                const isDone = !!item.is_done;
                
                const leadingActions = () => (
                  <LeadingActions>
                    <SwipeAction onClick={() => toggleItemDone(item)}>
                      <Box sx={{ 
                        bgcolor: isDone ? 'warning.main' : 'success.main', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        px: 3, 
                        height: '100%' 
                      }}>
                        {isDone ? <UndoIcon /> : <CheckIcon />}
                      </Box>
                    </SwipeAction>
                  </LeadingActions>
                );

                const trailingActions = () => (
                  <TrailingActions>
                    <SwipeAction
                      destructive={true}
                      onClick={() => removeItem(item.id)}
                    >
                      <Box sx={{ 
                        bgcolor: 'error.main', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        px: 3, 
                        height: '100%' 
                      }}>
                        <DeleteIcon />
                      </Box>
                    </SwipeAction>
                  </TrailingActions>
                );

                return (
                  <SwipeableList fullSwipe={false} type={SwipeType.IOS}>
                    <SwipeableListItem
                      key={item.id}
                      leadingActions={leadingActions()}
                      trailingActions={trailingActions()}
                    >
                      <ListItem 
                        divider={index < items.length - 1} 
                        onClick={() => handleItemClick(item)} 
                        sx={{ 
                            px: 2, 
                            py: 1.5, 
                            cursor: 'pointer',
                            bgcolor: isSelected ? 'action.selected' : 'background.paper',
                            '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
                            width: '100%',
                            opacity: isDone ? 0.6 : 1,
                            transition: 'opacity 0.2s'
                        }}
                      >
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
                            inputProps={{ style: { fontWeight: 600 } }}
                          />
                      ) : (
                        <ListItemText 
                          primary={item.itemName} 
                          primaryTypographyProps={{ 
                            fontWeight: 600,
                            sx: { textDecoration: isDone ? 'line-through' : 'none' }
                          }} 
                          sx={{ m: 0 }} 
                        />
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                        <TextField type="number" value={item.quantity} onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))} onClick={(e) => e.stopPropagation()} sx={{ width: '60px' }} size="small" inputProps={{ min: 1, style: { padding: '4px 8px', textAlign: 'center' } }} />
                        {editingId === item.id ? (
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); updateItemName(item.id, editingName); }} color="primary">
                                <SaveIcon fontSize="small" />
                            </IconButton>
                        ) : (
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditingName(item.itemName); }} sx={{ color: 'text.secondary' }}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        )}
                        <IconButton 
                          size="small" 
                          onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} 
                          sx={{ 
                            color: 'text.secondary', 
                            '&:hover': { color: 'error.main' },
                            display: { xs: 'none', sm: 'inline-flex' } // Hide delete icon on mobile, use swipe instead
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </ListItem>
                  </SwipeableListItem>
                </SwipeableList>
                );
              }}
            />
            {items.length === 0 && <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">{t('emptyList')}</Typography></Box>}
          </Paper>
        </Box>
      </Box>

      {/* Desktop Side Panel */}
      {!isMobile && hasSidePanel && (
        <Box sx={{ position: 'sticky', top: 84, alignSelf: 'start' }}>
          <ShoppingListSidePanel 
            selectedItemIds={selectedItemIds}
            selectedItems={selectedItems}
            cheapestStore={cheapestStore}
            groupedMatchesByStore={groupedMatchesByStore}
            loadingMatches={loadingMatches}
            expandedStores={expandedStores}
            toggleStore={toggleStore}
            toggleAllStores={toggleAllStores}
            clearSelection={clearSelection}
            handlePinItem={handlePinItem}
            minTotalsPerItem={minTotalsPerItem}
            storeResults={storeResults}
            activeSale={activeSale}
            setActiveSale={setActiveSale}
          />
        </Box>
      )}

      {/* Mobile Drawer & Summary Bar */}
      {isMobile && hasSidePanel && (
          <>
             {/* Summary Bar */}
             <Paper 
                onClick={() => setDrawerOpen(true)}
                elevation={10}
                sx={{ 
                    position: 'fixed', 
                    bottom: 56, // Height of BottomNav
                    left: 0, 
                    right: 0, 
                    p: 2, 
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    zIndex: 1000,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0px -4px 10px rgba(0,0,0,0.05)'
                }}
             >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {cheapestStore && getStoreLogo(cheapestStore.name) ? (
                        <Box sx={{ width: 100, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box 
                                component="img" 
                                src={getStoreLogo(cheapestStore.name)!} 
                                alt={cheapestStore.name}
                                sx={{ height: '100%', width: '100%', objectFit: 'contain' }}
                            />
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="caption" sx={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                {cheapestStore ? t('cheapestStore') : t('matchesFor')}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                                {cheapestStore ? cleanStoreName(cheapestStore.name) : `${selectedItems.length} items`}
                            </Typography>
                        </Box>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     {cheapestStore && <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>₪{cheapestStore.total}</Typography>}
                     <IconButton size="small" sx={{ bgcolor: 'action.hover' }}>
                        <KeyboardArrowUpIcon />
                     </IconButton>
                </Box>
             </Paper>

             <SwipeableDrawer
                anchor="bottom"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onOpen={() => setDrawerOpen(true)}
                disableSwipeToOpen={false}
                PaperProps={{
                    sx: {
                        height: '85vh',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        p: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
             >
                 <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }} onClick={() => setDrawerOpen(false)}>
                    <Box sx={{ width: 40, height: 5, bgcolor: 'divider', borderRadius: 3 }} />
                 </Box>
                 <Box sx={{ overflowY: 'auto', px: 3, pb: 4, flex: 1 }}>
                    <ShoppingListSidePanel 
                        selectedItemIds={selectedItemIds}
                        selectedItems={selectedItems}
                        cheapestStore={cheapestStore}
                        groupedMatchesByStore={groupedMatchesByStore}
                        loadingMatches={loadingMatches}
                        expandedStores={expandedStores}
                        toggleStore={toggleStore}
                        toggleAllStores={toggleAllStores}
                        clearSelection={clearSelection}
                        handlePinItem={handlePinItem}
                        minTotalsPerItem={minTotalsPerItem}
                        storeResults={storeResults}
                        activeSale={activeSale}
                        setActiveSale={setActiveSale}
                    />
                 </Box>
             </SwipeableDrawer>
          </>
      )}

      <AddItemFAB 
        onAdd={addItem} 
        autocompleteOptions={autocompleteOptions} 
        sx={isMobile && hasSidePanel ? { bottom: 140 } : undefined}
      />
    </Box>
  );
};

export default ShoppingListPage;
