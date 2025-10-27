const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Post = require('../models/Post')
const auth = require('../middleware/auth')
const upload = require('../middleware/upload')
const fs = require('fs')

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

        const filePath = req.file.path.replace(/\\/g, '/')
        // /uploads/avatar-xxx.jpg

        const user = await User.findById(req.user.id)
        user.profilePicture = filePath
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

        if (!user.profilePicture || user.profilePicture === '') {
            return res.status(400).json({ msg: 'No profile picture to delete.'})
        }

        const imagePath = user.profilePicture

        user.profilePicture = ''
        await user.save()

        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error('Failed to delete profile picture file:', err)
            } else {
                console.log(`Successfully deleted ${imagePath}`)
            }
        })

        res.json({ msg: 'Profile picture removed successfully.' })

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

module.exports = router