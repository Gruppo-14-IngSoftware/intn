const mongoose = require('mongoose');

const companyInfoRequestSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'answered'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CompanyInfoRequest', companyInfoRequestSchema);
