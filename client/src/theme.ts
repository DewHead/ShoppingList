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
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff', // Solid background for data density
    },
    text: {
      primary: mode === 'dark' ? '#f3f4f6' : '#111827', // Gray 50 vs Gray 900
      secondary: mode === 'dark' ? '#d1d5db' : '#4b5563', // Gray 300 vs Gray 600 (Better contrast)
    },
    divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
  },
  shape: {
    borderRadius: 16, // Softer corners
  },
  typography: {
    fontFamily: '"Inter", "IBM Plex Sans Hebrew", "system-ui", sans-serif', // Added IBM Plex Sans Hebrew for RTL
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.3,
    },
    h6: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
    caption: {
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8, // Specific override for buttons
          padding: '8px 16px', // Tighter padding
          transition: 'all 0.2s',
          '&:active': {
            transform: 'scale(0.98)',
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
      defaultProps: {
        elevation: 0,
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          border: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          // Remove global bgcolor override to allow specific components to control it, 
          // or set a safe default that respects the palette.
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8, // Specific override for inputs
            transition: 'all 0.2s',
            '& fieldset': {
              borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: mode === 'dark' ? '#b39ddb' : '#673ab7',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#673ab7',
              borderWidth: '1px', // Keep it sturdy, not too thick
            },
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Rounded list items if they have background
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
});
