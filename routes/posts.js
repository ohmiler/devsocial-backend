const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const Post = require('../models/Post')
const User = require('../models/User')

router.post('/', auth, async(req, res) => {
    const { content, codeSnippet } = req.body

    try {
        const user = await User.findById(req.user.id).select('-password')

        const newPost = new Post({
            content,
            codeSnippet,
            author: req.user.id
        })

        const savedPost = await newPost.save()

        const populatedPost = await Post.findById(savedPost._id).populate('author', ['username', 'profilePicture'])

        res.json(populatedPost)
        
    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

router.get('/', async(req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skipIndex = (page - 1) * limit

    try {
        const posts = await Post.find()
            .populate('author', ['username', 'profilePicture'])
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'username'
                }
            })
            .sort({ createdAt: -1 })
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

router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', ['username', 'profilePicture'])
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'username'
                }
            })

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' })
        }

        res.json(post)

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

router.put('/:id/like', auth, async(req, res) => {
    try {
        const post = await Post.findById(req.params.id)

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' })
        }

        if (post.likes.some(like => like.toString() === req.user.id)) {
            post.likes = post.likes.filter(
                like => like.toString() !== req.user.id
            )
        } else {
            post.likes.unshift(req.user.id)
        }

        await post.save()
        res.json(post.likes)

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

router.post('/:id/comment', auth, async(req, res) => {
    const { text } = req.body

    if (!text) {
        return res.status(400).json({ msg: 'Comment text is required' })
    }

    try {
        const post = await Post.findById(req.params.id)
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' })
        }

        const newComment = {
            author: req.user.id,
            text: text
        }

        post.comments.unshift(newComment)
        await post.save()
        const populatedPost = await Post.findById(post._id).populate('comments.author', 'username')
        res.json(populatedPost.comments)

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server Error')
    }
})

router.put('/:id', auth, async (req, res) => {
    const { content, codeSnippet } = req.body

    try {
        let post = await Post.findById(req.params.id)

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' })
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized'})
        }

        post.content = content
        if (codeSnippet) {
            post.codeSnippet = codeSnippet
        }

        await post.save()

        post = await post.populate('author', ['username', 'profilePicture'])
        res.json(post)

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

router.delete('/:id', auth, async(req, res) => {
    try {

        const post = await Post.findById(req.params.id)

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' })
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized'})
        }

        await post.deleteOne()

        res.json({ msg: 'Post removed' })

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server Error')
    }
})

router.put('/:postId/comments/:commentId', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId)
        const { text } = req.body

        const comment = post.comments.find(comment => comment.id === req.params.commentId)

        if (!comment) {
            return res.status(404).json({ msg: 'Comment not found' })
        }

        if (comment.author.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized'})
        }

        comment.text = text

        await post.save()

        const populatedPost = await Post.findById(post._id).populate('comments.author', 'username')
        res.json(populatedPost.comments)

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId)

        const comment = post.comments.find(comment => comment.id === req.params.commentId)

        if (!comment) {
            return res.status(404).json({ msg: 'Comment does not exist' })
        }

        if (comment.author.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized'})
        }

        post.comments = post.comments.filter(comment => comment.id !== req.params.commentId)

        await post.save()

        res.json(post.comments)

    } catch(err) {
        console.error(err.message)
        res.status(500).send('Server error')
    }
})

module.exports = router