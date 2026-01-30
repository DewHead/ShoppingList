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

  const VirtuosoComponents = {
    Scroller: forwardRef<HTMLDivElement, any>((props, ref) => (
      <TableContainer component={Paper} {...props} ref={ref} sx={{ bgcolor: 'background.paper' }} />
    )),
...
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
