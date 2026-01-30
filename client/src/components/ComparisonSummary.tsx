import { Paper, Typography, Box, useTheme, Skeleton } from '@mui/material';
...
export default function ComparisonSummary({ cheapestStore, maxTotal }: ComparisonSummaryProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!cheapestStore) {
    return (
      <Paper 
        elevation={0} 
        variant="outlined"
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 4, 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 3,
          minHeight: 128
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="rounded" width={80} height={80} />
          <Box>
            <Skeleton width={100} height={20} />
            <Skeleton width={150} height={40} />
          </Box>
        </Box>
        <Box sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
          <Skeleton width={120} height={60} />
          <Skeleton width={80} height={20} />
        </Box>
      </Paper>
    );
  }

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
        <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 80, height: 80 }}>
          {getStoreLogo(cheapestStore.name) ? (
            <Box 
              component="img" 
              src={getStoreLogo(cheapestStore.name)!} 
              alt={cheapestStore.name}
              sx={{ height: 60, width: '100%', objectFit: 'contain' }}
            />
          ) : (
            <StoreIcon fontSize="large" color="success" />
          )}
        </Box>
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.9, fontWeight: 700, letterSpacing: 1 }}>
            {t('cheapestStore')}
          </Typography>
          {!getStoreLogo(cheapestStore.name) && (
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {cleanStoreName(cheapestStore.name)}
            </Typography>
          )}
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
