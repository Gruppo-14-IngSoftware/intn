const Event = require('../models/Event');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

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

function isCompany(req, res, next) {
    if (req.user && req.user.role === 'company') {
        return next();
    }
    res.status(403).send('Accesso negato. Solo aziende possono accedere.');
}

module.exports = {
    isAuthenticated,
    isEventOwnerOrAdmin,
    isCompany
};
