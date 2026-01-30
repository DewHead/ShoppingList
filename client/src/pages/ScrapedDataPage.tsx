import React, { useEffect, useState, useCallback, useRef, useContext, forwardRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../useTranslation';
import { 
  useTheme, 
  Box,
  Switch,
  FormControlLabel,
  Tooltip,
  Button,
  Typography,
  Menu,
  Checkbox,
  FormGroup,
  Divider,
  Alert,
  TextField, 
  InputAdornment,
  Paper
} from '@mui/material';
import { ArrowLeft, AlertCircle, CreditCard, Settings, GripVertical, Search } from 'lucide-react';
import { AppContext } from '../AppContext';
import { cleanStoreName, getStoreLogo } from '../utils/comparisonUtils';
import { TableVirtuoso } from 'react-virtuoso';

interface SupermarketItem {
  id: number;
  remote_id: string;
  remote_name: string;
  price: number;
  unit_of_measure: string | null;
  unit_of_measure_price: number | null;
  manufacturer: string | null;
  country: string | null;
  last_updated: string;
  promo_description: string | null;
  branch_info?: string;
}

interface ColumnConfig {
  key: keyof SupermarketItem;
  label: string;
  visible: boolean;
  width: number;
}

export const ScrapedDataPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const theme = useTheme();
  const { showCreditCardPromos, toggleCreditCardPromos } = useContext(AppContext);
  
  const [items, setItems] = useState<SupermarketItem[]>([]);
  const [storeName, setStoreName] = useState<string>('');
  const [showOnlyPromos, setShowOnlyPromos] = useState<boolean>(false);
  const [showClubPromos, setShowClubPromos] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [page, setPage] = useState(1);
  const [, setHasMore] = useState(true);
  const [, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'promo_description', label: '', visible: true, width: 50 },
    { key: 'remote_name', label: t('productName'), visible: true, width: 250 },
    { key: 'remote_id', label: t('itemCode'), visible: true, width: 150 },
    { key: 'price', label: t('price'), visible: true, width: 90 },
    { key: 'unit_of_measure_price', label: t('unitPrice'), visible: false, width: 120 },
    { key: 'manufacturer', label: t('manufacturer'), visible: false, width: 180 },
    { key: 'country', label: t('country'), visible: false, width: 120 },
    { key: 'last_updated', label: t('lastUpdated'), visible: true, width: 180 },
  ]);

  const [columnAnchorEl, setColumnAnchorEl] = useState<null | HTMLElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const resizingRef = useRef<{ key: string, startWidth: number, startX: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, key: string, currentWidth: number) => {
    setIsResizing(true);
    resizingRef.current = { key, startWidth: currentWidth, startX: e.clientX };
    
    const localHandleMouseMove = (moveEvent: MouseEvent) => {
      if (resizingRef.current) {
        const deltaX = moveEvent.clientX - resizingRef.current.startX;
        const diff = language === 'he' ? -deltaX : deltaX; 
        const newWidth = Math.max(50, resizingRef.current.startWidth + diff);
        
        setColumns(prev => prev.map(col => 
          col.key === resizingRef.current!.key ? { ...col, width: newWidth } : col
        ));
      }
    };

    const localHandleMouseUp = () => {
      resizingRef.current = null;
      setIsResizing(false);
      document.removeEventListener('mousemove', localHandleMouseMove);
      document.removeEventListener('mouseup', localHandleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', localHandleMouseMove);
    document.addEventListener('mouseup', localHandleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  };

  const [draggedColKey, setDraggedColKey] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, key: string) => {
    if (isResizing) {
      e.preventDefault();
      return;
    }
    setDraggedColKey(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  };

  const onDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (draggedColKey !== targetKey) {
        const targetHeader = e.currentTarget as HTMLElement;
        if (language === 'he') {
            if (targetHeader.dir !== 'rtl') targetHeader.style.borderRight = '2px solid blue';
            else targetHeader.style.borderLeft = '2px solid blue';
        } else {
            targetHeader.style.borderRight = '2px solid blue';
        }
    }
  };

  const onDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    const targetHeader = e.currentTarget as HTMLElement;
    targetHeader.style.borderRight = '';
    targetHeader.style.borderLeft = '';

    if (!draggedColKey || draggedColKey === targetKey || isResizing) return;

    setColumns(prev => {
        const result = [...prev];
        const dragIdx = result.findIndex(c => c.key === draggedColKey);
        const dropIdx = result.findIndex(c => c.key === targetKey);
        const [removed] = result.splice(dragIdx, 1);
        result.splice(dropIdx, 0, removed);
        return result;
    });
    setDraggedColKey(null);
  };

  useEffect(() => {
    fetch(`http://localhost:3001/api/supermarkets`)
      .then(res => res.json())
      .then((data: any[]) => {
        const store = data.find(s => s.id === Number(id));
        if (store) setStoreName(store.name);
      })
      .catch(console.error);
  }, [id]);

  const fetchItems = useCallback((currentPage: number, shouldReset: boolean = false, search: string = searchQuery) => {
    setLoading(true);
    const url = new URL(`http://localhost:3001/api/supermarkets/${id}/items`);
    url.searchParams.append('page', currentPage.toString());
    url.searchParams.append('onlyPromos', showOnlyPromos.toString());
    url.searchParams.append('showSbox', showCreditCardPromos.toString());
    url.searchParams.append('showClubPromos', showClubPromos.toString());
    if (search) url.searchParams.append('search', search);

    fetch(url.toString())
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
      })
      .then(data => {
        if (shouldReset) {
          setItems(data.items);
        } else {
          setItems(prev => [...prev, ...data.items]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, showOnlyPromos, showCreditCardPromos, showClubPromos, searchQuery]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchItems(1, true, searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery, showOnlyPromos, showCreditCardPromos, showClubPromos]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchItems(nextPage);
  };

  const toggleColumn = (key: string) => {
    setColumns(prev => prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col));
  };

  const renderCell = (item: SupermarketItem, colKey: string) => {
    switch (colKey) {
        case 'promo_description':
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, height: '100%' }}>
                    {showCreditCardPromos && item.promo_description?.includes('SBOX') && (
                        <Tooltip title={<Box sx={{ direction: 'rtl', textAlign: 'right' }}>{t('creditCardPromoTooltip')}</Box>} arrow placement="top">
                            <Box sx={{ display: 'inline-flex', color: 'secondary.main', cursor: 'help' }}><CreditCard size={16} /></Box>
                        </Tooltip>
                    )}
                    {item.promo_description && (
                        <Tooltip title={<Box sx={{ direction: 'rtl', textAlign: 'right' }}>{item.promo_description}</Box>} arrow placement="top">
                            <Box sx={{ display: 'inline-flex', color: 'primary.main', cursor: 'help' }}><AlertCircle size={16} /></Box>
                        </Tooltip>
                    )}
                </Box>
            );
        case 'remote_name':
            return (
                <Typography variant="body2" dir="rtl" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'left' }}>
                    {item.remote_name}
                </Typography>
            );
        case 'remote_id':
            return <span className="font-mono text-xs opacity-70">{item.remote_id}</span>;
        case 'price':
            return <span className="font-bold text-primary-main">₪{item.price.toFixed(2)}</span>;
        case 'unit_of_measure_price':
            return item.unit_of_measure_price ? (
                <span className="text-xs opacity-80">
                    ₪{item.unit_of_measure_price.toFixed(2)} / {item.unit_of_measure}
                </span>
            ) : '-';
        case 'manufacturer':
            return <span className="text-sm opacity-80">{item.manufacturer || '-'}</span>;
        case 'country':
            return <span className="text-sm opacity-80">{item.country || '-'}</span>;
        case 'last_updated':
            return <span className="text-xs opacity-50">{new Date(item.last_updated).toLocaleString()}</span>;
        default:
            return null;
    }
  };

  const visibleCols = columns.filter(c => c.visible);

  const VirtuosoComponents = {
    Scroller: forwardRef<HTMLDivElement, any>((props, ref) => (
      <Box {...props} ref={ref} sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', boxShadow: 1 }} />
    )),
    Table: (props: any) => <table {...props} className={`${language === 'he' ? 'text-right' : 'text-left'} border-collapse`} style={{ tableLayout: 'fixed', width: '100%' }} />,
    TableHead: forwardRef<HTMLTableSectionElement, any>((props, ref) => <thead {...props} ref={ref} className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600" />),
    TableBody: forwardRef<HTMLTableSectionElement, any>((props, ref) => <tbody {...props} ref={ref} />),
    TableRow: (props: any) => <tr {...props} className="hover:bg-gray-50 dark:hover:bg-gray-750" style={{ borderBottom: `1px solid ${theme.palette.divider}` }} />,
  };

  const FixedHeaderContent = () => (
    <tr>
      {visibleCols.map((col) => (
        <th 
          key={col.key} 
          className="p-3 font-semibold relative select-none"
          style={{ 
              width: `${col.width}px`, 
              backgroundColor: theme.palette.background.paper,
              borderBottom: `1px solid ${theme.palette.divider}`
          }}
          onDragOver={(e) => isResizing ? undefined : onDragOver(e, col.key)}
          onDrop={(e) => isResizing ? undefined : onDrop(e, col.key)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, overflow: 'hidden' }}>
              <Box 
                  draggable 
                  onDragStart={(e) => isResizing ? e.preventDefault() : onDragStart(e, col.key)}
                  sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', opacity: 0.4, '&:hover': { opacity: 1 } }}
              >
                  <GripVertical size={14} className="flex-shrink-0" />
              </Box>
              <span className="text-ellipsis overflow-hidden whitespace-nowrap">{col.label}</span>
          </Box>
          
          <div 
              onMouseDown={(e) => handleMouseDown(e, col.key, col.width)}
              className={`absolute top-0 ${language === 'he' ? 'left-0' : 'right-0'} w-3 h-full cursor-col-resize `}
              style={{ 
                  zIndex: 100, 
                  backgroundColor: 'transparent', 
                  transition: 'background-color 0.1s ease-in-out'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.palette.primary.main + '30'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          />
        </th>
      ))}
    </tr>
  );

  const RowContent = (_index: number, item: SupermarketItem) => (
    <>
      {visibleCols.map((col) => (
        <td key={col.key} className="p-3 overflow-hidden text-ellipsis whitespace-nowrap text-center">
            {renderCell(item, col.key)}
        </td>
      ))}
    </>
  );

  return (
    <div className={`min-h-screen p-4 ${theme.palette.mode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`} dir={language === 'he' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', mb: 6, gap: 4 }}>
          <div className="flex items-center">
            <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              {language === 'he' ? <ArrowLeft className="transform rotate-180" /> : <ArrowLeft />}
            </button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: language === 'he' ? 0 : 4, mr: language === 'he' ? 4 : 0 }}>
              {getStoreLogo(storeName) ? (
                <>
                  <h1 className="text-2xl font-bold">
                    {language === 'he' ? 'נתונים שנאספו מ' : 'Scraped Data'}
                  </h1>
                  <Box 
                    component="img" 
                    src={getStoreLogo(storeName)!} 
                    alt={storeName}
                    sx={{ height: 48, width: 'auto', objectFit: 'contain' }}
                  />
                </>
              ) : (
                <h1 className="text-2xl font-bold">
                  {t('scrapedDataTitle').replace('%id%', cleanStoreName(storeName) || id || '')}
                </h1>
              )}
            </Box>
          </div>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <FormControlLabel
                control={<Switch checked={showOnlyPromos} onChange={(e) => setShowOnlyPromos(e.target.checked)} size="small" />}
                label={<Typography variant="body2">{t('showOnlyPromos')}</Typography>}
            />
            {(storeName.includes('קרפור') || storeName.includes('Carrefour')) && (
            <FormControlLabel
                control={<Switch checked={showClubPromos} onChange={(e) => setShowClubPromos(e.target.checked)} size="small" />}
                label={<Typography variant="body2">{t('showClubPromos')}</Typography>}
            />
            )}
            {(storeName.includes('שופרסל') || storeName.includes('Shufersal')) && (
            <FormControlLabel
                control={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CreditCard size={16} style={{ margin: '0 4px' }} />
                        <Switch checked={showCreditCardPromos} onChange={(e) => toggleCreditCardPromos(e.target.checked)} size="small" />
                    </Box>
                }
                label={<Typography variant="body2">{t('showCreditCardPromos')}</Typography>}
            />
            )}
          </Box>
        </Box>

        <Menu
            anchorEl={columnAnchorEl}
            open={Boolean(columnAnchorEl)}
            onClose={() => setColumnAnchorEl(null)}
        >
            <Box sx={{ p: 2, minWidth: 200 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('showHide')}</Typography>
                <Divider sx={{ mb: 1 }} />
                <FormGroup>
                    {columns.map(col => (
                        <FormControlLabel
                            key={col.key}
                            control={<Checkbox checked={col.visible} onChange={() => toggleColumn(col.key)} size="small" />}
                            label={<Typography variant="body2">{col.label}</Typography>}
                        />
                    ))}
                </FormGroup>
            </Box>
        </Menu>

        {error && <Alert severity="error" sx={{ mb: 4 }}>{t('error')}{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', alignSelf: 'flex-end' }}>
                <Button 
                    startIcon={<Settings size={18} />} 
                    variant="outlined" 
                    size="small"
                    onClick={(e) => setColumnAnchorEl(e.currentTarget)}
                >
                    {t('columns')}
                </Button>
                <TextField
                    sx={{ width: 300 }}
                    size="small"
                    dir={language === 'he' ? 'rtl' : 'ltr'}
                    placeholder={t('searchPlaceholder') || 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={16} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            <Paper variant="outlined" sx={{ height: '70vh', width: '100%', overflow: 'hidden' }}>
                <TableVirtuoso
                    data={items}
                    components={VirtuosoComponents}
                    fixedHeaderContent={FixedHeaderContent}
                    itemContent={RowContent}
                    endReached={loadMore}
                    increaseViewportBy={200}
                />
            </Paper>
        </Box>
      </div>
    </div>
  );
};
