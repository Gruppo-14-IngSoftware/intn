//MODELLO UTENTE
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
//SCHEMA UTENTE
const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    birthdate: {
        type: Date,
        required: true,
    },
    googleId: String,
    subscribedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String, 
        enum: ['user', 'company', 'admin', 'comune'],
        default: 'user'
    },
    createdAt: { 
        type: Date, default: Date.now 
    },
    verification: {
        status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
        documents: [String], // usato da aziende già registrate per upload documenti
        companyName: String,
        vatNumber: String,
        address: String,
        companyEmail: String,
        document: String // documento del titolare o legale rappresentante (file)
    }
});
//HASHING DELLA PASSWORD MEDIANTE SALTING, PER NON LASCIARLA IN CHIARO
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', userSchema);
