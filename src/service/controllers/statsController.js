/*CONTROLLER STATISTICHE PER ADMIN*/
const User = require('../models/User');
const mongoose = require('mongoose');

//NUMERO TOTALE UTENTI
exports.getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({ totalUsers });
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero dei dati' });
  }
};

//UTENTI CREATI NEGLI UTLIMI 7 GIORNI (AI HELP)
exports.getUserTrend = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero del trend utenti' });
  }
};

//CONTA UTENTI ATTIVI (AI HELP)
exports.getActiveUsers = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    //ACCEDI ALLA COLLECTION DELLE SESSIONI
    const sessionCollection = mongoose.connection.collection('sessions');

    const now = new Date();

    //CONTA SOLO LE SESSIONI NON SCADUTE
    const activeSessions = await sessionCollection.find({
      expires: { $gte: now }
    }).toArray();

    //ESTRARRE GLI USERID DALLE SESSIONI
    const activeUserIds = activeSessions
      .map(s => {
        try {
          return JSON.parse(s.session)?.passport?.user;
        } catch (err) {
          return null;
        }
      })
      .filter(uid => uid);

    const uniqueActiveUserCount = new Set(activeUserIds).size;

    res.json({
      totalUsers,
      activeUsers: uniqueActiveUserCount
    });

  } catch (err) {
    console.error('Errore utenti attivi:', err);
    res.status(500).json({ error: 'Errore nel recupero utenti attivi' });
  }
};


