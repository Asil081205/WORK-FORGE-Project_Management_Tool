const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware'); // ✅ Fixed import



// In your POST route
// PUT: Mark message as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the recipient
    if (message.recipientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to mark this message as read' });
    }

    message.read = true;
    await message.save();

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// In your POST route with debugging
router.post('/', protect, async (req, res) => {
  try {
    console.log('Received message request body:', req.body);
    console.log('User ID (sender):', req.user.id);
    
    const { content, recipientId, subject, isUrgent, messageType } = req.body;
    const senderId = req.user.id;

    console.log('Content:', content);
    console.log('Recipient ID:', recipientId);
    console.log('Recipient ID type:', typeof recipientId);

    if (!content || !recipientId) {
      return res.status(400).json({ 
        message: 'Content and recipientId are required',
        receivedContent: !!content,
        receivedRecipientId: !!recipientId,
        contentLength: content ? content.length : 0
      });
    }

    // Try to find recipient - handle both string ID and ObjectId
    let recipient;
    try {
      recipient = await User.findById(recipientId);
    } catch (error) {
      console.log('Error finding by ID, trying to find by other fields...');
      // Try to find by email or name if direct ID fails
      recipient = await User.findOne({
        $or: [
          { email: recipientId },
          { name: recipientId }
        ]
      });
    }

    if (!recipient) {
      console.log('Recipient not found with ID:', recipientId);
      return res.status(404).json({ 
        message: 'Recipient not found',
        recipientId: recipientId
      });
    }

    const newMessage = new Message({
      senderId,
      recipientId: recipient._id, // Use the found user's _id
      content,
      subject: subject || '',
      isUrgent: isUrgent || false,
      messageType: messageType || 'general',
      timestamp: new Date(),
      read: false
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name email role')
      .populate('recipientId', 'name email role');

    console.log('Message saved successfully:', populatedMessage._id);
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});
// GET: Get all messages for current user
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { recipientId: userId }]
    })
      .populate('senderId', 'name email role')
      .populate('recipientId', 'name email role')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;