//CONFIGURAZIONE DEL DB
const mongoose = require('mongoose');
const connectDB = async () => {
    try{
        mongoose.set('strictQuery',false);
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Connected to DB...`);
    }catch (error){
        console.log(error);
    }
}

module.exports = connectDB;




