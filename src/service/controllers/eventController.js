const Event = require('../models/Event');

exports.getEventsByMonth = async (req, res) => {
  try {
    const result = await Event.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEventsByTag = async (req, res) => {
  try {
    const result = await Event.aggregate([
      { $group: { _id: "$tag", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEventsVerified = async (req, res) => {
  try {
    const result = await Event.aggregate([
      { $group: { _id: "$verified", count: { $sum: 1 } } }
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEventsByRole = async (req, res) => {
  try {
    const result = await Event.aggregate([
      { $group: { _id: "$createdByRole", count: { $sum: 1 } } }
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
