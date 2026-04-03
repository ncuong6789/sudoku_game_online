const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Đăng ký (Register)
router.post('/register', async (req, res) => {
    try {
        const { username, password, displayName } = req.body;
        
        if (!username || !password || !displayName) {
            return res.status(400).json({ error: 'Vui lòng điền đủ thông tin.' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            password: hashedPassword,
            displayName
        });

        await newUser.save();
        
        // Auto login after register
        const token = jwt.sign({ userId: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({ 
            message: 'Đăng ký thành công', 
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                displayName: newUser.displayName,
                score: newUser.score
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi đăng ký.' });
    }
});

// Đăng nhập (Login)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Vui lòng điền đủ thông tin.' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
        }

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user._id,
                username: user.username,
                displayName: user.displayName,
                score: user.score,
                matchesPlayed: user.matchesPlayed,
                matchesWon: user.matchesWon
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi đăng nhập.' });
    }
});

// Lấy thông tin cá nhân (Profile)
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

        res.json(user);
    } catch (err) {
        res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
});

// Bảng xếp hạng (Leaderboard)
router.get('/leaderboard', async (req, res) => {
    try {
        const topUsers = await User.find().sort({ score: -1 }).limit(10).select('-password');
        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server khi lấy bảng xếp hạng.' });
    }
});

module.exports = router;
