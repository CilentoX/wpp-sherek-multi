const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class WhatsAppManager extends EventEmitter {
    constructor() {
        super();
        this.clients = new Map();
        this.scriptsDirectory = path.join(__dirname, 'shrek_script.txt');
    }

    async createClient(id, displayName = null) {
        if (this.clients.has(id)) {
            console.log(`Client ${id} already exists.`);
            return this.clients.get(id);
        }

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: id }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-extensions'
                ],
            }
        });

        const clientInfo = {
            id,
            displayName: displayName || id,
            client,
            status: 'INITIALIZING',
            qr: null,
            user: null
        };

        this.clients.set(id, clientInfo);

        client.on('qr', (qr) => {
            clientInfo.status = 'WAITING_QR';
            clientInfo.qr = qr;
            this.emit('status-update', { id, status: 'WAITING_QR', qr });
        });

        client.on('ready', () => {
            clientInfo.status = 'READY';
            clientInfo.qr = null;
            clientInfo.user = client.info.wid.user;
            this.emit('status-update', { id, status: 'READY', user: clientInfo.user });
            console.log(`Client ${id} is ready!`);
        });

        client.on('authenticated', () => {
            clientInfo.status = 'AUTHENTICATED';
            this.emit('status-update', { id, status: 'AUTHENTICATED' });
        });

        client.on('auth_failure', (msg) => {
            clientInfo.status = 'AUTH_FAILURE';
            this.emit('status-update', { id, status: 'AUTH_FAILURE', message: msg });
        });

        client.on('disconnected', (reason) => {
            clientInfo.status = 'DISCONNECTED';
            this.emit('status-update', { id, status: 'DISCONNECTED', reason });
            this.removeClient(id);
        });

        client.on('message_create', async (msg) => {
            if (msg.body.trim() === '!shrek') {
                this.startShrekScript(id, msg);
            }
        });

        try {
            await client.initialize();
        } catch (err) {
            console.error(`Error initializing client ${id}:`, err);
            clientInfo.status = 'ERROR';
            this.emit('status-update', { id, status: 'ERROR', message: err.message });
        }

        return clientInfo;
    }

    async startShrekScript(id, msg) {
        const clientInfo = this.clients.get(id);
        if (!clientInfo || clientInfo.status !== 'READY') return;

        const chat = await msg.getChat();
        console.log(`Starting Shrek script for ${id} in chat ${chat.name}`);

        try {
            if (!fs.existsSync(this.scriptsDirectory)) {
                await msg.reply('Erro: roteiro não encontrado.');
                return;
            }

            const script = fs.readFileSync(this.scriptsDirectory, 'utf8');
            const lines = script
                .split(/\n+/)
                .map(line => line.trim())
                .filter(line => line);

            for (const line of lines) {
                // Check if client still exists and is ready
                if (!this.clients.has(id)) break;
                
                await clientInfo.client.sendMessage(chat.id._serialized, line);
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            await clientInfo.client.sendMessage(chat.id._serialized, 'Fim do roteiro. Shrek é vida!');
        } catch (error) {
            console.error(`Error in Shrek script for ${id}:`, error);
        }
    }

    removeClient(id) {
        const clientInfo = this.clients.get(id);
        if (clientInfo) {
            clientInfo.client.destroy();
            this.clients.delete(id);
        }
    }

    getAllClientsStatus() {
        const status = [];
        this.clients.forEach((val, key) => {
            status.push({
                id: key,
                displayName: val.displayName,
                status: val.status,
                qr: val.qr,
                user: val.user
            });
        });
        return status;
    }
}

module.exports = new WhatsAppManager();
