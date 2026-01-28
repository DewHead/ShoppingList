import { useState } from 'react';
import { 
  Fab, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Autocomplete,
  Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '../useTranslation';

interface AddItemFABProps {
  onAdd: (name: string, quantity: number) => void;
  autocompleteOptions: string[];
  sx?: any;
}

export default function AddItemFAB({ onAdd, autocompleteOptions, sx }: AddItemFABProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const { t } = useTranslation();

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setName('');
    setQuantity(1);
  };

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name, quantity);
      handleClose();
    }
  };

  return (
    <>
      <Fab 
        color="primary" 
        aria-label="add" 
        onClick={handleOpen}
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 80, sm: 32 }, 
          right: 32, 
          zIndex: 1100,
          ...sx 
        }}
      >
        <AddIcon />
      </Fab>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>{t('addItem')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Autocomplete
              freeSolo
              options={autocompleteOptions}
              value={name}
              onInputChange={(_, newValue) => setName(newValue)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  autoFocus 
                  placeholder={t('addItemPlaceholder')} 
                  fullWidth 
                />
              )}
            />
            <TextField
              type="number"
              label={t('quantity')}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              inputProps={{ min: 1 }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>{t('cancel')}</Button>
          <Button onClick={handleAdd} variant="contained">{t('add')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
