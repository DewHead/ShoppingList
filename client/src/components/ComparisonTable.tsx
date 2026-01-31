import React, { forwardRef } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  TableSortLabel,
  Box,
  Typography,
  CircularProgress,
  Tooltip,
  useTheme
} from '@mui/material';
import { TableVirtuoso } from 'react-virtuoso';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ComparisonMatrixRow } from '../utils/comparisonUtils';
import { cleanStoreName, getStoreLogo } from '../utils/comparisonUtils';
import PriceCell from './PriceCell';
import { useTranslation } from '../useTranslation';

interface Store {
  id: number;
  name: string;
}

export interface StoreTotal {
  id: number;
  total: string;
  missing: number;
  isValid: boolean;
}

interface ComparisonTableProps {
  data: ComparisonMatrixRow[];
  activeStores: Store[];
  onSort: (columnId: 'product' | number, direction: 'asc' | 'desc') => void;
  sortConfig: { key: 'product' | number; direction: 'asc' | 'desc' };
  storeStatuses?: Record<number, string>;
  storeTotals?: Record<number, StoreTotal>;
  minTotal?: number | null;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ 
  data, 
  activeStores, 
  onSort, 
  sortConfig,
  storeStatuses = {},
  storeTotals = {},
  minTotal = null
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isRtl = theme.direction === 'rtl';

  const createSortHandler = (property: 'product' | number) => () => {
    const isAsc = sortConfig.key === property && sortConfig.direction === 'asc';
    onSort(property, isAsc ? 'desc' : 'asc');
  };

  const getStoreStatus = (storeId: number) => {
    const status = storeStatuses[storeId];
    if (!status) return null;
    
    const isError = status.startsWith('Error');
    const isLoading = !status.startsWith('Done') && !isError;
    
    return { status, isError, isLoading };
  };

  const VirtuosoComponents = {
    Scroller: forwardRef<HTMLDivElement, any>((props, ref) => (
      <TableContainer component={Paper} {...props} ref={ref} sx={{ bgcolor: 'background.paper' }} />
    )),
    Table: (props: any) => <Table {...props} stickyHeader style={{ borderCollapse: 'separate' }} />,
    TableHead: forwardRef<HTMLTableSectionElement, any>((props, ref) => <TableHead {...props} ref={ref} />),
    TableBody: forwardRef<HTMLTableSectionElement, any>((props, ref) => <TableBody {...props} ref={ref} />),
    TableRow: (props: any) => <TableRow {...props} hover />,
  };

  const FixedHeaderContent = () => (
    <TableRow sx={{ backgroundColor: 'background.paper' }}>
      <TableCell 
        sx={{ 
          fontWeight: 'bold', 
          backgroundColor: 'background.paper',
          position: 'sticky',
          left: isRtl ? 'auto' : 0,
          right: isRtl ? 0 : 'auto',
          zIndex: 3, 
          minWidth: { xs: 100, sm: 150 },
          maxWidth: { xs: 120, sm: 250 },
          width: { xs: 100, sm: 150 }
        }}
      >
        <TableSortLabel
          active={sortConfig.key === 'product'}
          direction={sortConfig.key === 'product' ? sortConfig.direction : 'asc'}
          onClick={createSortHandler('product')}
        >
          {t('product')}
        </TableSortLabel>
      </TableCell>
      {activeStores.map((store) => {
        const statusInfo = getStoreStatus(store.id);
        const totalData = storeTotals[store.id];
        const isCheapest = minTotal !== null && totalData?.isValid && parseFloat(totalData.total) === minTotal;

        return (
          <TableCell 
            key={store.id} 
            align="center"
            sx={{ 
              fontWeight: 'bold', 
              minWidth: { xs: 80, sm: 120 },
              backgroundColor: 'background.paper'
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <TableSortLabel
                active={sortConfig.key === store.id}
                direction={sortConfig.key === store.id ? sortConfig.direction : 'asc'}
                onClick={createSortHandler(store.id)}
              >
                {getStoreLogo(store.name) ? (
                  <Box sx={{ 
                    width: { xs: 80, sm: 120 }, 
                    height: 32, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Box 
                      component="img" 
                      src={getStoreLogo(store.name)!} 
                      alt={store.name}
                      sx={{ height: '100%', width: '100%', objectFit: 'contain' }}
                    />
                  </Box>
                ) : (
                  cleanStoreName(store.name)
                )}
              </TableSortLabel>
              
              {statusInfo?.isLoading ? (
                <Tooltip title={statusInfo.status}>
                  <CircularProgress size={16} sx={{ my: 0.5 }} />
                </Tooltip>
              ) : totalData?.isValid ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: isCheapest ? 900 : 600,
                      fontSize: isCheapest ? { xs: '0.9rem', sm: '1.1rem' } : { xs: '0.75rem', sm: '0.875rem' },
                      bgcolor: isCheapest ? 'success.light' : 'transparent',
                      px: isCheapest ? 1 : 0,
                      borderRadius: 1,
                      color: isCheapest ? 'success.contrastText' : 'text.primary',
                    }}
                  >
                    ₪{totalData.total}
                  </Typography>
                </Box>
              ) : statusInfo?.isError ? (
                <Tooltip title={statusInfo.status}>
                  <ErrorOutlineIcon color="error" sx={{ fontSize: 18, mt: 0.5 }} />
                </Tooltip>
              ) : (
                <Box sx={{ height: 24 }} /> 
              )}
            </Box>
          </TableCell>
        );
      })}
    </TableRow>
  );

  const rowContent = (_index: number, row: ComparisonMatrixRow) => (
    <>
      <TableCell 
        component="th" 
        scope="row"
        sx={{ 
          position: 'sticky',
          left: isRtl ? 'auto' : 0,
          right: isRtl ? 0 : 'auto',
          backgroundColor: 'background.paper',
          zIndex: 1,
          fontWeight: 500,
          minWidth: { xs: 100, sm: 150 },
          maxWidth: { xs: 120, sm: 250 },
          width: { xs: 100, sm: 150 },
          padding: { xs: '8px 4px', sm: '16px' }
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            lineHeight: 1.2,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {row.productName}
        </Typography>
      </TableCell>
      {activeStores.map((store) => {
        const statusInfo = getStoreStatus(store.id);
        return (
          <TableCell 
            key={store.id} 
            align="center" 
            padding="none"
            sx={{ 
              opacity: statusInfo?.isLoading ? 0.5 : 1,
              transition: 'opacity 0.3s ease'
            }}
          >
            <PriceCell priceInfo={row.prices[store.id]} />
          </TableCell>
        );
      })}
    </>
  );

  return (
    <TableVirtuoso
      useWindowScroll
      data={data}
      components={VirtuosoComponents}
      fixedHeaderContent={FixedHeaderContent}
      itemContent={rowContent}
    />
  );
};

export default ComparisonTable;