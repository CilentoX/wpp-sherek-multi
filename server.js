const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const manager = require('./WhatsAppManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoints
app.get('/api/clients', (req, res) => {
    res.json(manager.getAllClientsStatus());
});

app.post('/api/clients', async (req, res) => {
    const { name } = req.body;
    const id = uuidv4();
    
    manager.createClient(id, name);
    res.json({ id, name, message: `Client ${name} initialization started` });
});

app.delete('/api/clients/:id', (req, res) => {
    manager.removeClient(req.params.id);
    res.json({ message: `Client ${req.params.id} removed` });
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
    console.log('Client connected to socket');
    
    socket.on('join', (id) => {
        socket.join(id);
        console.log(`Socket joined room: ${id}`);
        // Send current status of this specific client if it exists
        const clients = manager.getAllClientsStatus();
        const client = clients.find(c => c.id === id);
        if (client) {
            socket.emit('status-update', client);
        }
    });

    manager.on('status-update', (data) => {
        // Broadcast to the specific room
        io.to(data.id).emit('status-update', data);
        // Also broadcast to the dashboard 'admin' room if we implement it, 
        // but for now let's just broadcast everything to 'admin' room for dashboard
        io.to('admin').emit('status-update', data);
    });

    socket.on('join-admin', () => {
        socket.join('admin');
        socket.emit('init', manager.getAllClientsStatus());
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
