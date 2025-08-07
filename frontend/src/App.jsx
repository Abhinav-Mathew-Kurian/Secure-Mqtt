import React from 'react';
import LiveChart from './components/LiveChart';
import { Container, Box, Typography } from '@mui/material';

const App = () => {
  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" gutterBottom>Secure MQTT Live Sensor Dashboard</Typography>
        <LiveChart />
      </Box>
    </Container>
  );
};

export default App;
