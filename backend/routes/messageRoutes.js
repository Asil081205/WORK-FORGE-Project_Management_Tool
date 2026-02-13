// In routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authenticate = require('../middleware/auth');

// ... your existing message routes ...

// Mark all messages as read for current user
router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await Message.updateMany(
      { recipientId: userId, read: false },
      { $set: { read: true } }
    );
    
    res.json({ success: true, message: 'All messages marked as read' });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark single message as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;