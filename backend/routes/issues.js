const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @route   GET /api/issues
// @desc    Get all issues for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;

    let issues;

    if (['Super Admin', 'Project Manager', 'HR'].includes(user.role)) {
      issues = await Issue.find().populate('project reporter assignee', 'name email role avatar');
    } else if (user.role === 'Team Member') {
      issues = await Issue.find({
        $or: [
          { assignee: user._id },
          { reporter: user._id }
        ]
      }).populate('project reporter assignee', 'name email role avatar');
    } else if (user.role === 'Client') {
      const projects = await Project.find({ client: user._id });
      const projectIds = projects.map(p => p._id);
      issues = await Issue.find({ project: { $in: projectIds } }).populate('project reporter assignee', 'name email role avatar');
    }

    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;