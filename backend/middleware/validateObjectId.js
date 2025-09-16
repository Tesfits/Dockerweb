const mongoose = require('mongoose');

module.exports = (paramName = 'id') => (req, res, next) => {
  const id = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid id parameter' });
  }
  next();
};
