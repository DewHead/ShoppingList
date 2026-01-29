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
  Typography
} from '@mui/material';
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
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ 
  data, 
  activeStores, 
  onSort, 
  sortConfig 
}) => {
  const { t } = useTranslation();

  const createSortHandler = (property: 'product' | number) => () => {
    const isAsc = sortConfig.key === property && sortConfig.direction === 'asc';
    onSort(property, isAsc ? 'desc' : 'asc');
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: '70vh', overflow: 'auto' }}>
      <Table stickyHeader aria-label="comparison table">
        <TableHead>
          <TableRow>
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
            {activeStores.map((store) => (
              <TableCell 
                key={store.id} 
                align="center"
                sx={{ fontWeight: 'bold', minWidth: 120 }}
              >
                <TableSortLabel
                  active={sortConfig.key === store.id}
                  direction={sortConfig.key === store.id ? sortConfig.direction : 'asc'}
                  onClick={createSortHandler(store.id)}
                >
                  {store.name}
                </TableSortLabel>
              </TableCell>
            ))}
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
              {activeStores.map((store) => (
                <TableCell key={store.id} align="center" padding="none">
                  <PriceCell priceInfo={row.prices[store.id]} />
                </TableCell>
              ))}
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
