import mongoose, { Mongoose,Schema } from "mongoose";

const subscriptionSchema = new Schema({
  subscriber: {
    type: Schema.Types.ObjectId, //one who is subscribing
    ref: "User",
  },
  channel: {
    type: Schema.Types.ObjectId, //one to who subscriber is subscribing
    ref: "User",
  }
},
{
    timestamps:true
});

const Subscription = mongoose.model("Subscription",subscriptionSchema)