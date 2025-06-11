/*GESTIONE MIDDLEWARE PER SICUREZZA ROTTR*/

const Event = require('../models/Event');

//MIDDLWARE DI AUTENTICAZIONE
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

//MIDDLWARE POSSESSO EVENTO o ADMIN
async function isEventOwnerOrAdmin(req, res, next) {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).send('Evento non trovato');

        const userId = req.user?._id?.toString();
        const eventOwnerId = event.createdBy?.toString();

        if (userId === eventOwnerId || req.user.role === 'admin') {
            return next();
        }
        res.status(403).send('Accesso vietato.');
    } catch (err) {
        console.error("Errore", err);
        res.status(500).send('Errore server');
    }
}

//MIDDLEWARE CONTROLLO ADMIN
function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Accesso riservato agli amministratori');
    res.redirect('/admin');
}

//MIDDLEWARE DI CONTROLLO RUOLO=AZIENDA
function isCompany(req, res, next) {
    if (req.user && req.user.role === 'company') {
        return next();
    }
    res.status(403).send('Accesso negato. Solo aziende possono accedere.');
}

module.exports = {
    isAuthenticated,
    isEventOwnerOrAdmin,
    isAdmin,
    isCompany
};
