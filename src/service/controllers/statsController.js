const User = require('../models/User');
const mongoose = require('mongoose');


//STATISTICHE - UTENTI 
exports.getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({ totalUsers });
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero dei dati' });
  }
};

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

exports.getActiveUsers = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    // Accedi alla collection delle sessioni
    const sessionCollection = mongoose.connection.collection('sessions');

    const now = new Date();

    // Conta solo le sessioni non scadute
    const activeSessions = await sessionCollection.find({
      expires: { $gte: now }
    }).toArray();

    // Estrarre gli userId dalle sessioni
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


