import React from 'react';
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
  Tooltip
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ComparisonMatrixRow } from '../utils/comparisonUtils';
import PriceCell from './PriceCell';
import { useTranslation } from '../useTranslation';

interface Store {
  id: number;
  name: string;
}

interface ComparisonTableProps {
  data: ComparisonMatrixRow[];
  activeStores: Store[];
  onSort: (columnId: 'product' | number, direction: 'asc' | 'desc') => void;
  sortConfig: { key: 'product' | number; direction: 'asc' | 'desc' };
  storeStatuses?: Record<number, string>;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ 
  data, 
  activeStores, 
  onSort, 
  sortConfig,
  storeStatuses = {}
}) => {
  const { t } = useTranslation();

  const createSortHandler = (property: 'product' | number) => () => {
    const isAsc = sortConfig.key === property && sortConfig.direction === 'asc';
    onSort(property, isAsc ? 'desc' : 'asc');
  };

  const getStoreStatus = (storeId: number) => {
    const status = storeStatuses[storeId];
    if (!status) return null;
    
    const isError = status.startsWith('Error');
    const isLoading = status !== 'Done' && !isError;
    
    return { status, isError, isLoading };
  };

  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        maxHeight: '70vh', 
        overflow: 'auto',
        bgcolor: 'background.paper'
      }}
    >
      <Table stickyHeader aria-label="comparison table">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'background.paper' }}>
            <TableCell 
              sx={{ 
                fontWeight: 'bold', 
                backgroundColor: 'background.paper',
                position: 'sticky',
                left: 0,
                zIndex: 3, // Higher than other headers
                minWidth: 150
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
              return (
                <TableCell 
                  key={store.id} 
                  align="center"
                  sx={{ 
                    fontWeight: 'bold', 
                    minWidth: 120,
                    backgroundColor: 'background.paper'
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <TableSortLabel
                      active={sortConfig.key === store.id}
                      direction={sortConfig.key === store.id ? sortConfig.direction : 'asc'}
                      onClick={createSortHandler(store.id)}
                    >
                      {store.name}
                    </TableSortLabel>
                    
                    {statusInfo?.isLoading && (
                      <Tooltip title={statusInfo.status}>
                        <CircularProgress size={16} sx={{ mt: 0.5 }} />
                      </Tooltip>
                    )}
                    
                    {statusInfo?.isError && (
                      <Tooltip title={statusInfo.status}>
                        <ErrorOutlineIcon color="error" sx={{ fontSize: 18, mt: 0.5 }} />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.productName}
              hover
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell 
                component="th" 
                scope="row"
                sx={{ 
                  position: 'sticky',
                  left: 0,
                  backgroundColor: 'background.paper',
                  zIndex: 1,
                  fontWeight: 500
                }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
                  {row.productName}
                </Typography>
              </TableCell>
              {activeStores.map((store) => {
                const statusInfo = getStoreStatus(store.id);
                return (
                  <TableCell key={store.id} align="center" padding="none">
                    {statusInfo?.isLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                        <CircularProgress size={20} color="inherit" sx={{ opacity: 0.3 }} />
                      </Box>
                    ) : (
                      <PriceCell priceInfo={row.prices[store.id]} />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {data.length === 0 && (
             <TableRow>
               <TableCell colSpan={activeStores.length + 1} align="center">
                 <Typography variant="body1" sx={{ p: 4, color: 'text.secondary' }}>
                   {t('noData')}
                 </Typography>
               </TableCell>
             </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ComparisonTable;
