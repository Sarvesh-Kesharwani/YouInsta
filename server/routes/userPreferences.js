const express = require('express');
const router = express.Router();
const UserPreferences = require('../models/UserPreferences');

// Get user preferences
router.get('/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    let userPrefs = await UserPreferences.findOne({ userId });
    
    if (!userPrefs) {
      // Create default preferences if none exist
      userPrefs = new UserPreferences({ userId });
      await userPrefs.save();
    }
    
    res.json(userPrefs);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

// Update user preferences
router.put('/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const updateData = req.body;
    
    // Remove userId from update data to prevent conflicts
    delete updateData.userId;
    
    const userPrefs = await UserPreferences.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, upsert: true }
    );
    
    res.json(userPrefs);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// Update specific fields
router.patch('/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const updateData = req.body;
    
    // Remove userId from update data to prevent conflicts
    delete updateData.userId;
    
    const userPrefs = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true }
    );
    
    res.json(userPrefs);
  } catch (error) {
    console.error('Error patching user preferences:', error);
    res.status(500).json({ error: 'Failed to patch user preferences' });
  }
});

// Delete user preferences
router.delete('/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    await UserPreferences.findOneAndDelete({ userId });
    res.json({ message: 'User preferences deleted successfully' });
  } catch (error) {
    console.error('Error deleting user preferences:', error);
    res.status(500).json({ error: 'Failed to delete user preferences' });
  }
});

// Reset user preferences to defaults
router.post('/:userId?/reset', async (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const defaultPrefs = new UserPreferences({ userId });
    await defaultPrefs.save();
    
    res.json(defaultPrefs);
  } catch (error) {
    console.error('Error resetting user preferences:', error);
    res.status(500).json({ error: 'Failed to reset user preferences' });
  }
});

module.exports = router; 