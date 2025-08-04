const express = require('express');
const router = express.Router();
const Clip = require('../models/Clip');

// Get all clips
router.get('/', async (req, res) => {
  try {
    const { watched, memorized, directoryType, limit = 100, skip = 0 } = req.query;
    
    let query = {};
    
    if (watched !== undefined) {
      query.isWatched = watched === 'true';
    }
    
    if (memorized !== undefined) {
      query.isMemorized = memorized === 'true';
    }
    
    if (directoryType) {
      query.directoryType = directoryType;
    }
    
    const clips = await Clip.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    res.json(clips);
  } catch (error) {
    console.error('Error fetching clips:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
});

// Get clip by ID
router.get('/:id', async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id);
    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    res.json(clip);
  } catch (error) {
    console.error('Error fetching clip:', error);
    res.status(500).json({ error: 'Failed to fetch clip' });
  }
});

// Create new clip
router.post('/', async (req, res) => {
  try {
    const clipData = req.body;
    const clip = new Clip(clipData);
    await clip.save();
    res.status(201).json(clip);
  } catch (error) {
    console.error('Error creating clip:', error);
    res.status(500).json({ error: 'Failed to create clip' });
  }
});

// Update clip
router.put('/:id', async (req, res) => {
  try {
    const clip = await Clip.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    res.json(clip);
  } catch (error) {
    console.error('Error updating clip:', error);
    res.status(500).json({ error: 'Failed to update clip' });
  }
});

// Update clip by video path and time range (for finding existing clips)
router.put('/find-and-update', async (req, res) => {
  try {
    const { videoPath, startTime, endTime, ...updateData } = req.body;
    
    const clip = await Clip.findOneAndUpdate(
      { videoPath, startTime, endTime },
      updateData,
      { new: true, upsert: true }
    );
    
    res.json(clip);
  } catch (error) {
    console.error('Error finding and updating clip:', error);
    res.status(500).json({ error: 'Failed to find and update clip' });
  }
});

// Delete clip
router.delete('/:id', async (req, res) => {
  try {
    const clip = await Clip.findByIdAndDelete(req.params.id);
    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    res.json({ message: 'Clip deleted successfully' });
  } catch (error) {
    console.error('Error deleting clip:', error);
    res.status(500).json({ error: 'Failed to delete clip' });
  }
});

// Bulk operations
router.post('/bulk', async (req, res) => {
  try {
    const { operation, clips } = req.body;
    
    switch (operation) {
      case 'create':
        const createdClips = await Clip.insertMany(clips);
        res.status(201).json(createdClips);
        break;
        
      case 'update':
        const updatePromises = clips.map(clip => 
          Clip.findByIdAndUpdate(clip._id, clip, { new: true })
        );
        const updatedClips = await Promise.all(updatePromises);
        res.json(updatedClips);
        break;
        
      case 'delete':
        const deleteIds = clips.map(clip => clip._id);
        await Clip.deleteMany({ _id: { $in: deleteIds } });
        res.json({ message: `${deleteIds.length} clips deleted successfully` });
        break;
        
      default:
        res.status(400).json({ error: 'Invalid operation' });
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

// Get clips statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Clip.aggregate([
      {
        $group: {
          _id: null,
          totalClips: { $sum: 1 },
          watchedClips: { $sum: { $cond: ['$isWatched', 1, 0] } },
          memorizedClips: { $sum: { $cond: ['$isMemorized', 1, 0] } },
          totalWatchTime: { $sum: '$totalWatchTime' },
          totalWatchCount: { $sum: '$watchCount' }
        }
      }
    ]);
    
    const directoryStats = await Clip.aggregate([
      {
        $group: {
          _id: '$directoryType',
          count: { $sum: 1 },
          watched: { $sum: { $cond: ['$isWatched', 1, 0] } },
          memorized: { $sum: { $cond: ['$isMemorized', 1, 0] } }
        }
      }
    ]);
    
    res.json({
      overall: stats[0] || {
        totalClips: 0,
        watchedClips: 0,
        memorizedClips: 0,
        totalWatchTime: 0,
        totalWatchCount: 0
      },
      byDirectory: directoryStats
    });
  } catch (error) {
    console.error('Error fetching clip statistics:', error);
    res.status(500).json({ error: 'Failed to fetch clip statistics' });
  }
});

module.exports = router; 