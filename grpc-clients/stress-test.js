import WebSocket from 'ws';

const CLIENTS = 100;

for (let i = 0; i < CLIENTS; i++) {
  const ws = new WebSocket('ws://localhost:3002?token=YOUR_TOKEN');

  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      payload: {
        channels: ['stats', 'requests', 'notifications']
      }
    }));

    console.log(`WS Client ${i} connected`);
  });

  ws.on('message', () => {
    // simulate UI consume
  });

  ws.on('error', console.error);
}