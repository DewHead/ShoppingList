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
      p: 1
    }}>
      {isCheapest && (
        <Chip
          icon={<StarIcon style={{ fontSize: 14 }} />}
          label={t('bestPrice')}
          size="small"
          color="success"
          sx={{ 
            height: 20, 
            fontSize: '0.65rem', 
            mb: 0.5,
            '& .MuiChip-label': { px: 1 }
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
          textUnderlineOffset: '3px'
        }}
      >
        {displayPrice}
      </Typography>

      {promo && (
        <Tooltip title={promo} arrow placement="top">
             <Typography variant="caption" color="primary" sx={{ cursor: 'help', fontSize: '0.7rem' }}>
                {t('promo')}
             </Typography>
        </Tooltip>
      )}
    </Box>
  );
};

export default PriceCell;
