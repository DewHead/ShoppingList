import { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  Collapse, 
  Tooltip 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ExpandMore, ExpandLess, PushPin, PushPinOutlined } from '@mui/icons-material';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from '../useTranslation';
import { calculateBestPrice } from '../utils/comparisonUtils';

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

interface ShoppingListItem {
  id: number;
  itemName: string;
  quantity: number;
  itemId: number;
  is_done?: number | boolean;
}

interface ShoppingListSidePanelProps {
  selectedItemIds: number[];
  selectedItems: ShoppingListItem[];
  cheapestStore: any;
  groupedMatchesByStore: Record<string, { item: ShoppingListItem, matches: SearchResult[] }[]>;
  loadingMatches: boolean;
  expandedStores: string[];
  toggleStore: (storeName: string) => void;
  toggleAllStores: () => void;
  clearSelection: () => void;
  handlePinItem: (itemId: number, supermarketId: number, remoteId: string, currentIsPinned: boolean) => void;
  minTotalsPerItem: Record<number, number>;
  storeResults: Record<number, any[]>;
  activeSale: number | null;
  setActiveSale: (index: number | null) => void;
}

export default function ShoppingListSidePanel({
  selectedItemIds,
  selectedItems,
  cheapestStore,
  groupedMatchesByStore,
  loadingMatches,
  expandedStores,
  toggleStore,
  toggleAllStores,
  clearSelection,
  handlePinItem,
  minTotalsPerItem,
  storeResults,
  activeSale,
  setActiveSale
}: ShoppingListSidePanelProps) {
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);

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
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                {displayName}
                            </Typography>
                            {match.promo_description && (() => {
                                const isSbox = match.promo_description.includes('SBOX');
                                if (!isSbox) return true;
                                const storeSetting = localStorage.getItem(`showCreditCardPromos_${match.supermarket_id}`);
                                return storeSetting ? JSON.parse(storeSetting) : false;
                            })() && (
                                <Tooltip title={getPromoMessage(match.promo_description, item.quantity)} arrow placement="top">
                                    <Box sx={{ display: 'inline-flex', color: 'primary.main', cursor: 'help' }}><AlertCircle size={16} /></Box>
                                </Tooltip>
                            )}
                        </Box>
                        {displayName !== match.remote_name && (
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                                {match.remote_name}
                            </Typography>
                        )}
                    </Box>
                } 
                primaryTypographyProps={{ component: 'div' }}
            />
            <Box sx={{ textAlign: 'right', ml: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    ₪{match.price.toFixed(2)}
                </Typography>
                <Box sx={{ minWidth: '60px', textAlign: 'right' }}>
                    {isPromo && (
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', display: 'block', lineHeight: 1 }}>
                            ₪{originalTotal.toFixed(2)}
                        </Typography>
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 700, color: priceColor }}>
                        ₪{total.toFixed(2)}
                    </Typography>
                </Box>
            </Box>
        </ListItem>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {selectedItemIds.length > 0 && (
            <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden', bgcolor: 'background.paper' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                        {selectedItems.length === 1 ? `${t('matchesFor')} "${selectedItems[0].itemName}"` : `${t('matchesFor')} ${selectedItems.length} items`}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" onClick={toggleAllStores} sx={{ minWidth: 'auto', px: 1 }}>{expandedStores.length === Object.keys(groupedMatchesByStore).length ? <ExpandLess /> : <ExpandMore />}</Button>
                        <IconButton size="small" onClick={clearSelection}><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                </Box>
                {loadingMatches ? <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">Loading...</Typography></Box> : Object.keys(groupedMatchesByStore).length === 0 ? <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">No matches found.</Typography></Box> : (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {Object.entries(groupedMatchesByStore).map(([storeName, itemsWithMatches]) => {
                            const isExpanded = expandedStores.includes(storeName);
                            return (
                                <Box key={storeName} sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                                    <Box onClick={() => toggleStore(storeName)} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', p: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                                        <IconButton size="small" sx={{ p: 0, mr: 1 }}>{isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</IconButton>
                                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>{storeName}</Typography>
                                    </Box>
                                    {!isExpanded && (
                                        <Box sx={{ pl: 1, pb: 1 }}>
                                            <List dense disablePadding>
                                                {itemsWithMatches.map(({ item, matches }) => {
                                                    const bestMatch = matches[0];
                                                    return bestMatch ? renderMatchItem(bestMatch, item, minTotalsPerItem[item.id], true) : null;
                                                })}
                                            </List>
                                        </Box>
                                    )}
                                    <Collapse in={isExpanded} timeout="auto">
                                        <Box sx={{ pl: 2, pb: 2, pr: 2 }}>
                                            {itemsWithMatches.map(({ item, matches }) => (
                                                <Box key={item.id} sx={{ mb: itemsWithMatches.length > 1 ? 2 : 0, pl: itemsWithMatches.length > 1 ? 1 : 0, borderLeft: itemsWithMatches.length > 1 ? '2px solid' : 'none', borderColor: 'primary.main' }}>
                                                    {selectedItems.length > 1 && <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'primary.main' }}>{item.itemName} ({item.quantity})</Typography>}
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
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>{t('cheapestStore')}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>{cheapestStore.name}</Typography>
                  {cheapestStore.missing > 0 && <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>* {cheapestStore.missing} items missing</Typography>}
                </Box>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>₪{cheapestStore.total}</Typography>
              </Box>
              
              <Button 
                endIcon={detailsOpen ? <ExpandLess /> : <ExpandMore />} 
                onClick={() => setDetailsOpen(!detailsOpen)}
                fullWidth
                sx={{ mb: detailsOpen ? 1 : 0, justifyContent: 'space-between', color: 'text.secondary' }}
              >
                {detailsOpen ? 'Hide Breakdown' : 'Show Price Breakdown'}
              </Button>

              <Collapse in={detailsOpen}>
                <List sx={{ p: 0, mt: 1, maxHeight: '50vh', overflowY: 'auto' }}>
                  {cheapestStore.results.map((r: any, i: number) => (
                    <ListItem key={i} sx={{ px: 0, py: 1.5 }} divider={i < cheapestStore.results.length - 1}>
                      <ListItemText 
                          primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.item.itemName}</Typography>
                                  {r.saleDetails && (
                                      <span className="sale-indicator" onClick={() => setActiveSale(activeSale === i ? null : i)}>
                                          <span className="exclamation-mark">!</span>
                                          {activeSale === i && <div className="sale-popup">{r.saleDetails}</div>}
                                      </span>
                                  )}
                              </Box>
                          } 
                          secondary={r.name} 
                          secondaryTypographyProps={{ noWrap: true, variant: 'caption' }} 
                      />
                      <Typography variant="body1" sx={{ fontWeight: 700, ml: 2, textAlign: 'right' }}>{r.price}</Typography>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Paper>
          )}
      </Box>
  );
}
