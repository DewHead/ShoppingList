import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material/styles';

export const getTheme = (mode: PaletteMode, direction: 'ltr' | 'rtl') => createTheme({
  direction,
  palette: {
    mode,
    primary: {
      main: '#673ab7', // Deep Purple (Material UI)
    },
    secondary: {
      main: '#9575cd', // Deep Purple (Lighter)
    },
    background: {
      default: 'transparent',
      paper: mode === 'dark' ? 'rgba(40, 40, 40, 0.7)' : 'rgba(103, 58, 183, 0.15)',
    },
    text: {
      primary: mode === 'dark' ? '#ede7f6' : '#312d45', // Lavender White / Dark Slate
      secondary: mode === 'dark' ? '#b39ddb' : '#673ab7',
    },
    divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.24)' : 'rgba(0, 0, 0, 0.24)',
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", "system-ui", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '10px 24px',
          transition: 'all 0.2s',
          border: '2px solid transparent',
          '&:hover': {
            border: '2px solid',
            borderColor: '#4a403a',
          },
        },
        containedPrimary: {
          backgroundColor: '#673ab7',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#5e35b1',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          border: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          backgroundColor: mode === 'dark' ? 'rgba(40, 40, 40, 0.7)' : 'rgba(103, 58, 183, 0.15)',
          backdropFilter: 'blur(2px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            border: '1px solid',
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
            backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'transparent',
            transition: 'all 0.2s',
            '& fieldset': {
              border: 'none',
            },
            '&:hover': {
              borderColor: mode === 'dark' ? '#c27a55' : '#5f6f52',
            },
            '&.Mui-focused': {
              borderColor: 'primary.main',
              boxShadow: `0 0 0 2px ${mode === 'dark' ? 'rgba(103, 58, 183, 0.5)' : 'rgba(103, 58, 183, 0.2)'}`,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          color: 'text.primary',
          boxShadow: 'none',
        },
      },
    },
  },
});
