import React from 'react';
import { Card, CardHeader, CardContent, Typography, Divider } from '@mui/material';

interface SettingsCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ title, children, className, icon }) => {
  return (
    <Card className={className} sx={{ mb: 2, overflow: 'visible' }}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {icon}
            {title}
          </Typography>
        }
      />
      <Divider />
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default SettingsCard;
