//SCHEMA EVENTO
const mongoose = require('mongoose');
const schema = mongoose.Schema;
const commentSchema = new mongoose.Schema({
    text: { type: String, required: true },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const eventSchema = new schema({
    title:{
        type: String,
        required: true,
    },
    description:{
        type: String,
        required: true,
    },
    location:{
        type:String,
        required: true,
    },
    coordinates: {
        type: {
            latitude: Number,
            longitude: Number
        },
        default: null
    },
    date:{
        type:Date,
        required: true,
    },
    tag:{
        type:String,
        required: true
    },
    images: [String],
    verified: {
        type: Boolean,
        default: false
    },
    documents: {
        type: [String],
        default: []
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByRole: {
        type: String,
        enum: ['user', 'impresa'],
        default: 'user'
    },
    comments: [commentSchema],
    reports: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt:{
        type:Date,
        default:Date.now
    },
    updateAt:{
        type:Date,
        default:Date.now
    }
});
module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);


