const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Post = require('../models/Post')
const auth = require('../middleware/auth')
// const upload = require('../middleware/upload')
const fs = require('fs')
const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')
const dotenv = require('dotenv').config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads',
        allowed_formats: ['jpg', 'png', 'jpeg']
    }
})

const upload = multer({ storage: storage })

router.get('/:username', async(req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).select('-password')
        if (!user) {
            return res.status(404).json({ msg: 'User not found' })
        }

        res.json(user)
    
    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

router.get('/:username/posts', async(req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skipIndex = (page - 1) * limit

    try {
        const user = await User.findOne({ username: req.params.username })
        if (!user) {
            return res.status(404).json({ msg: 'User not found' })
        }

        const posts = await Post.find({ author: user._id })
            .populate('author', ['username', 'profilePicture'])
            .populate({
                path:'comments',
                populate: {
                    path: 'author',
                    select: 'username'
                }
            })
            .sort({ createAt: -1 })
            .limit(limit)
            .skip(skipIndex)
        
            const totalPosts = await Post.countDocuments()
            const hasMore = (page * limit) < totalPosts
        
        res.json({
            posts,
            hasMore
        })

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

router.post('/me/avatar', [auth, upload.single('avatar')], async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Please upload a file' })
        }

        // const filePath = req.file.path.replace(/\\/g, '/')
        // /uploads/avatar-xxx.jpg

        const user = await User.findById(req.user.id)

        if (user.profilePicturePublicId) {
            await cloudinary.uploader.destroy(user.profilePicturePublicId)
        }

        user.profilePicture = req.file.path
        user.profilePicturePublicId = req.file.filename

        console.log(req)

        await user.save()
        res.json({ profilePicture: user.profilePicture })

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

router.delete('/me/avatar', auth, async(req, res) => {
    try {
        const user = await User.findById(req.user.id)

        if (!user.profilePicturePublicId) {
            return res.status(400).json({ msg: 'No profile picture to delete'})
        }

        await cloudinary.uploader.destroy(user.profilePicturePublicId)

        user.profilePicture = undefined
        user.profilePicturePublicId = undefined

        await user.save()

        res.json({ msg: 'Profile picture removed successfully.' })

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

module.exports = router