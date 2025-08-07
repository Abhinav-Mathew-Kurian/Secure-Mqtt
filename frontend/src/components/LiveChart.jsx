import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  Legend, AreaChart, Area
} from 'recharts';
import {
  Paper, Typography, Box, Grid, Card, CardContent,
  Chip, Drawer, List, ListItem, ListItemText, ListItemIcon,
  AppBar, Toolbar, Badge
} from '@mui/material';

// Sensor configurations
const sensorConfigs = [
  { key: 'temperature', label: 'Temperature', unit: '°C', color: '#f44336', icon: '🌡️' },
  { key: 'humidity', label: 'Humidity', unit: '%', color: '#2196f3', icon: '💧' },
  { key: 'speed', label: 'Speed', unit: 'km/h', color: '#4caf50', icon: '🚀' },
  { key: 'battery', label: 'Battery', unit: '%', color: '#ff9800', icon: '🔋' },
  { key: 'pressure', label: 'Pressure', unit: 'hPa', color: '#9c27b0', icon: '📊' }
];

// Helper utilities
const formatData = ({ timestamp, sensors }) => ({
  time: new Date(timestamp).toLocaleTimeString(),
  fullTime: new Date(timestamp).toLocaleString(),
  temperature: +sensors.temperature,
  humidity: +sensors.humidity,
  speed: +sensors.speed,
  battery: +sensors.battery,
  pressure: +sensors.pressure,
});

const getTrend = (data, key) => {
  if (!data || data.length < 2) return 'neutral';
  const [prev, curr] = [data[data.length - 2][key], data[data.length - 1][key]];
  return curr > prev ? 'up' : curr < prev ? 'down' : 'neutral';
};

const getTrendColor = t => t === 'up' ? '#4caf50' : t === 'down' ? '#f44336' : '#9e9e9e';
const getTrendIcon = t => t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.9)', color: 'white' }}>
      <Typography sx={{ fontWeight: 'bold', mb: 1 }}>{label}</Typography>
      {payload.map(({ color, dataKey, value }, i) => (
        <Typography key={i} sx={{ color, fontSize: '0.875rem' }}>
          {`${dataKey}: ${value?.toFixed(2)}`}
        </Typography>
      ))}
    </Paper>
  );
};

const Sidebar = ({ carData, selectedCar, onCarSelect, connectionStatus }) => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          bgcolor: '#f5f5f5',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 1 }}>
          🚗 AutoSense
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Real-time Vehicle Monitoring
        </Typography>

        {/* Connection Status */}
        <Paper sx={{
          p: 2, mb: 3,
          bgcolor: connectionStatus.includes('Connected') ? '#1b5e20' : '#e65100',
          color: 'white'
        }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            🌐 WebSocket
          </Typography>
          <Typography variant="caption">{connectionStatus}</Typography>
        </Paper>

        {/* Vehicle List */}
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          🚙 Active Vehicles
          <Badge badgeContent={Object.keys(carData).length} color="primary" />
        </Typography>

        {Object.keys(carData).length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#fafafa' }}>
            <Typography variant="body2" color="text.secondary">
              📡 Waiting for data...
            </Typography>
          </Paper>
        ) : (
          <List>
            {Object.keys(carData).map(carId => (
              <ListItem
                key={carId}
                button
                selected={selectedCar === carId}
                onClick={() => onCarSelect(carId)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  bgcolor: selectedCar === carId ? '#1976d2' : 'transparent',
                  color: selectedCar === carId ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: selectedCar === carId ? '#1565c0' : '#e3f2fd',
                  }
                }}
              >
                <ListItemIcon sx={{ color: selectedCar === carId ? 'white' : '#1976d2' }}>
                  🚗
                </ListItemIcon>
                <ListItemText
                  primary={carId.toUpperCase()}
                  secondary={`${carData[carId]?.length || 0} readings`}
                  secondaryTypographyProps={{
                    color: selectedCar === carId ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {/* System Info */}
        <Paper sx={{ p: 2, mt: 3, bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Last update: {new Date().toLocaleTimeString()}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Buffer size: 50 readings
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Refresh rate: Real-time
          </Typography>
        </Paper>
      </Box>
    </Drawer>
  );
};

const LiveChart = () => {
  const [carData, setCarData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [latestValues, setLatestValues] = useState({});
  const [selectedCar, setSelectedCar] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('http://localhost:5001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnectionStatus('Connected'));
    socket.on('disconnect', r => setConnectionStatus(`Disconnected: ${r}`));
    socket.on('connect_error', e => setConnectionStatus(`Connection Error: ${e.message}`));

    socket.on('sensor-data', incoming => {
      const { carId } = incoming;
      const formatted = formatData(incoming);

      setCarData(prev => {
        const newData = {
          ...prev,
          [carId]: [...(prev[carId] || []).slice(-49), formatted]
        };
        
        // Auto-select first car
        if (!selectedCar && Object.keys(newData).length > 0) {
          setSelectedCar(Object.keys(newData)[0]);
        }
        
        return newData;
      });

      setLatestValues(prev => ({
        ...prev,
        [carId]: {
          ...formatted,
          lastUpdate: new Date(incoming.timestamp)
        }
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedCar]);

  const currentCarData = selectedCar ? carData[selectedCar] : [];
  const currentLatest = selectedCar ? latestValues[selectedCar] : {};

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Sidebar 
        carData={carData}
        selectedCar={selectedCar}
        onCarSelect={setSelectedCar}
        connectionStatus={connectionStatus}
      />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: 0 }}>
        {/* Header */}
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 1 }}>
          {selectedCar ? `🚗 ${selectedCar.toUpperCase()} Dashboard` : '🚗 Vehicle Dashboard'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {selectedCar ? `Monitoring ${currentCarData.length} data points in real-time` : 'Select a vehicle to view sensor data'}
        </Typography>

        {selectedCar ? (
          <>
            {/* Sensor Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {sensorConfigs.map(({ key, label, unit, color, icon }) => {
                const trend = getTrend(currentCarData, key);
                const value = currentLatest[key] || 0;
                return (
                  <Grid item xs={12} sm={6} md={2.4} key={key}>
                    <Card sx={{
                      border: `2px solid ${color}`,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': { 
                        transform: 'translateY(-4px)', 
                        boxShadow: `0 8px 20px ${color}30` 
                      }
                    }}>
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {icon} {label}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color, mb: 1 }}>
                          {value.toFixed(1)} <Typography component="span" variant="body2" color="text.secondary">{unit}</Typography>
                        </Typography>
                        <Chip 
                          size="small" 
                          label={getTrendIcon(trend)} 
                          sx={{
                            bgcolor: getTrendColor(trend),
                            color: 'white',
                            fontSize: '14px'
                          }} 
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Main Multi-Sensor Chart */}
            <Paper elevation={6} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h5" align="center" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 3 }}>
                📈 Real-Time Multi-Sensor Chart
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={currentCarData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.7} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#666" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    tick={{ fontSize: 11 }} 
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="#666" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {sensorConfigs.map(({ key, label, color, icon }) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={3}
                      dot={false}
                      name={`${icon} ${label}`}
                      activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: color }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <Typography align="center" sx={{ mt: 2, color: '#666' }}>
                Raw sensor values shown in native units • Real-time updates
              </Typography>
            </Paper>

            {/* Individual Sensor Detail Charts */}
            <Grid container spacing={3}>
              {sensorConfigs.slice(0, 4).map(({ key, label, color, icon, unit }) => (
                <Grid item xs={12} md={6} key={key}>
                  <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color, mb: 2 }}>
                      {icon} {label} Detail
                    </Typography>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={currentCarData.slice(-20)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="time" stroke="#666" fontSize={10} />
                        <YAxis stroke="#666" fontSize={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey={key}
                          stroke={color}
                          fill={color}
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        ) : (
          <Paper sx={{ p: 8, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            <Typography variant="h2" sx={{ mb: 2 }}>🚗</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
              No Vehicle Selected
            </Typography>
            <Typography color="text.secondary">
              {Object.keys(carData).length === 0 
                ? 'Waiting for sensor data from vehicles...'
                : 'Select a vehicle from the sidebar to view its dashboard'
              }
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default LiveChart;