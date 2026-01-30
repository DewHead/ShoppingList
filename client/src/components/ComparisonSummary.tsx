import { Paper, Typography, Box, useTheme } from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StoreIcon from '@mui/icons-material/Store';
import { useTranslation } from '../useTranslation';
import { cleanStoreName } from '../utils/comparisonUtils';

interface ComparisonSummaryProps {
  cheapestStore: {
    name: string;
    total: string;
  } | null;
  maxTotal: string | null;
}

export default function ComparisonSummary({ cheapestStore, maxTotal }: ComparisonSummaryProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!cheapestStore) return null;

  const savings = maxTotal ? (parseFloat(maxTotal) - parseFloat(cheapestStore.total)).toFixed(2) : '0.00';

  return (
    <Paper 
      elevation={4} 
      sx={{ 
        p: 3, 
        mb: 4, 
        borderRadius: 4, 
        background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
        color: 'white',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 1.5, borderRadius: '50%' }}>
          <StoreIcon fontSize="large" />
        </Box>
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.9, fontWeight: 700, letterSpacing: 1 }}>
            {t('cheapestStore')}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            {cleanStoreName(cheapestStore.name)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
        <Typography variant="h3" sx={{ fontWeight: 900 }}>
          ₪{cheapestStore.total}
        </Typography>
        {parseFloat(savings) > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-end' }, gap: 0.5 }}>
            <TrendingDownIcon fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('saveText', { amount: savings }) || `Save ₪${savings}`}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
