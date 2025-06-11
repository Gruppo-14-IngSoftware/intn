//CONFIGURAZIONE SERVER
require('dotenv').config(); //INCLUSIONE FILE.ENV PER TOKEN E PASSWORD VARIE
const app = require('../../app');
const http = require('http');

const port = normalizePort(process.env.PORT || '5000');
app.set('port', port);

const server = http.createServer(app);
server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});

function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) return val;
    if (port >= 0) return port;
    return false;
}
