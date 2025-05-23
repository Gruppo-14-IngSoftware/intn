//SCHEMA EVENTO
const mongoose = require('mongoose');
const schema = mongoose.Schema;
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
    date:{
        type:Date,
        required: true,
    },
    tag:{
        type:String,
        required: true
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    updateAt:{
        type:Date,
        default:Date.now
    }
});
module.exports = mongoose.model('Event', eventSchema);


