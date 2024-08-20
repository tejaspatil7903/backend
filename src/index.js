//main file from which code starts, file that runs immediatly after reload

import dotenv from 'dotenv'
import connectDB from "./db/index.js";
import { app } from './app.js';
dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`Listening on Port no. ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log("MongoDB Connection Failed!!! ",error)
})