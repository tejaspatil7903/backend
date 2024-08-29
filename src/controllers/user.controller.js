import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'

// to generate access and refresh tokens

const generateAccessAndRefreshTokens = async (userId) => {
  try{
    const user = await User.findById(userId)
    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()

    user.refreshToken=refreshToken;
    await user.save({ validateBeforeSave: false })

    return {accessToken,refreshToken}
  }
  catch(error){
    throw new ApiError(500,"Something went wrong while generating refresh and access token")
  }
}

//for Signup or registration

const registerUser = asyncHandler(async (req,res)=>{
  const{fullName,email,userName,password}= req.body
 // console.log("email: ",email)

  if([fullName,email,userName,password].some((field)=>
    field?.trim()==="")){
        throw new ApiError(400, "All fields are required")
  }
  const existedUser = await User.findOne({
    $or:[{userName},{email}]
  })
  if(existedUser){
    throw new ApiError(409,"User with email or username already exists.")
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //console.log(req.files)
 // const coverImageLocalPath=req.files?.coverImage[0].path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0){
    coverImageLocalPath=req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!!!"));
})
//For logIn
const loginUser=asyncHandler(async(req,res)=>{
   const {userName,email,password}=req.body;
   if(!userName && !email){
    throw new ApiError(400,"Username or email is required")
   }
   const user = await User.findOne({
    $or: [{userName},{email}]
   })

   if(!user){
    throw new ApiError(404,"User does not exists");
   }
   const isPasswordValid=await user.isPasswordCorrect(password);
   if(!isPasswordValid){
    throw new ApiError(401,"Password incorrect")
   }

   const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly:true,
    secure:true
  }

  return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(
    new ApiResponse(200,{
      user:loggedInUser,accessToken,refreshToken
    },"User Logged In Successfully!!!")
  )

})
// to logout
const logoutUser=asyncHandler(async(req,res)=>{
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken:undefined
      },
    },
    {
      new:true
    }
  )
  const options = {
    httpOnly: true,
    secure: true,
  }
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))

})

//regenerating refresh and access token

const refreshAccessToken=asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized Request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401,"Invalid refresh token")
    }
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh token is expired or used")
    }
    const options = {
      httpOnly:true,
      secure:true
    }
    const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
  
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
      new ApiResponse(
        200,
        {accessToken,refreshToken:newRefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(501,error?.message || "Invalid refresh token")
  }
})
//change password
const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword}=req.body
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400,"Invalid old password")
  }
  user.password=newPassword
  await user.save({validateBeforeSave:false})

  return res
  .status(200)
  .json(
    new ApiResponse(200,{},"Password changed")
  )
})

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json(200,req.user,"Current user fetched succesfully")
})
// update details
const updateAccoutDetails=asyncHandler(async(req,res)=>{
  const {fullName,email} = req.body
  if(!fullName || !email){
    throw new ApiError(400, "No data provided")
  }
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName,
        email
      }
    },
    {new:true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"Account details updated succefully"))

})

const updateAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath=req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar){
    throw new ApiError(400,"Error while uploading avatar")
  }
  //avatar.url
  //replace this url with previous url in db

  const avatarUrl = avatar?.url;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar:avatarUrl
      },
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
})

const updateCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path;
  if(!coverImageLocalPath){
    throw new ApiError(400,"CoverImage is required")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage.url){
    throw new ApiError(400,"Error while uploading cover image");
  }
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage:coverImage.url
      }
    },
    {new:true}
  ).select("-password")
  return res
  .status(200)
  .json(new ApiResponse(200,user,"CoverImage updated successfully"))
})

export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccoutDetails,updateAvatar,updateCoverImage}; 