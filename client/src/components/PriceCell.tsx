import React from 'react';
import { Typography, Box, Tooltip, Chip } from '@mui/material';
import type { PriceInfo } from '../utils/comparisonUtils';
import StarIcon from '@mui/icons-material/Star';
import { useTranslation } from '../useTranslation';

interface PriceCellProps {
  priceInfo: PriceInfo;
}

const PriceCell: React.FC<PriceCellProps> = ({ priceInfo }) => {
  const { t } = useTranslation();

  if (!priceInfo) {
    return (
      <Typography variant="body2" color="text.disabled" align="center">
        ...
      </Typography>
    );
  }

  const { displayPrice, isCheapest, status, promo } = priceInfo;

  if (status === 'missing') {
    return (
      <Typography variant="body2" color="text.disabled" align="center">
        -
      </Typography>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      position: 'relative',
      p: { xs: 0.25, sm: 1 },
      minHeight: { xs: 40, sm: 60 },
      justifyContent: 'center'
    }}>
      {isCheapest && (
        <Chip
          icon={<StarIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />}
          label={<Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('bestPrice')}</Box>}
          size="small"
          color="success"
          sx={{ 
            height: { xs: 16, sm: 20 }, 
            width: { xs: 20, sm: 'auto' },
            minWidth: { xs: 20, sm: 'auto' },
            fontSize: '0.65rem', 
            mb: 0.5,
            '& .MuiChip-label': { px: { xs: 0, sm: 1 } },
            '& .MuiChip-icon': { m: 0 }
          }}
        />
      )}
      
      <Typography 
        variant="body1" 
        sx={{ 
          fontWeight: isCheapest ? 700 : 400,
          color: isCheapest ? 'success.main' : 'text.primary',
          textDecoration: promo ? 'underline' : 'none',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: '3px',
          fontSize: { xs: '0.8rem', sm: '1rem' }
        }}
      >
        {displayPrice}
      </Typography>

      {promo && (
        <Tooltip title={promo} arrow placement="top">
             <Typography variant="caption" color="primary" sx={{ cursor: 'help', fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                {t('promo')}
             </Typography>
        </Tooltip>
      )}
    </Box>
  );
};

export default PriceCell;
