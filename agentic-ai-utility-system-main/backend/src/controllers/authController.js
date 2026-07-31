import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { validationResult } from 'express-validator';

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Token generation with rotation
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Send OTP (mock - can integrate with Twilio/SendGrid)
const sendOTP = async (email, otp) => {
  console.log(`📧 OTP for ${email}: ${otp}`);
  // TODO: Integrate with actual email/SMS service
  // await emailService.send({ to: email, subject: 'Your OTP', text: `Your OTP is: ${otp}` });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register user with email/password
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role = 'citizen' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password (handled by User model pre-save hook)
    const user = await User.create({
      name,
      email,
      password, // Will be hashed by pre-save hook
      role,
      avatar: null,
      bio: null,
      phone: null,
      isVerified: false,
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login with email/password
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Login with Google OAuth
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Link Google ID if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = user.avatar || picture;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        role: 'citizen',
        isVerified: true,
        password: await bcrypt.hash(crypto.randomUUID(), 10), // Random password
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Google login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Invalid Google token' });
  }
};

// @desc    Request OTP for login/signup
// @route   POST /api/auth/otp/request
// @access  Public
export const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in cache (Redis would be ideal, using memory for now)
    // In production: await redis.set(`otp:${email}`, otp, 'EX', 300); // 5 minutes
    req.app.locals.otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    // Send OTP
    await sendOTP(email, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: { email },
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// @desc    Verify OTP and login/signup
// @route   POST /api/auth/otp/verify
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP
    const storedOTP = req.app.locals.otpStore[email];
    if (!storedOTP || storedOTP.expires < Date.now()) {
      return res.status(401).json({ message: 'OTP expired or invalid' });
    }

    if (storedOTP.otp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = await User.create({
        email,
        name: email.split('@')[0], // Use email username as default name
        role: 'citizen',
        isVerified: true,
        password: await bcrypt.hash(crypto.randomUUID(), 10),
      });
    }

    // Clear OTP
    delete req.app.locals.otpStore[email];

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'OTP verification successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (requires valid refresh token)
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens (rotation)
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Store new refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, phone } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (bio) user.bio = bio;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          bio: user.bio,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
