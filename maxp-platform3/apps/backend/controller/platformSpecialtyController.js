const businessSpecialtyService = require('../services/businessSpecialtyService');

const listSpecialties = async (req, res) => {
  try {
    const items = await businessSpecialtyService.listAdminSpecialties();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSpecialty = async (req, res) => {
  try {
    const specialty = await businessSpecialtyService.createSpecialty(req.body);
    res.json({ success: true, data: specialty });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const updateSpecialty = async (req, res) => {
  try {
    const specialty = await businessSpecialtyService.updateSpecialty(req.params.id, req.body);
    res.json({ success: true, data: specialty });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const removeSpecialty = async (req, res) => {
  try {
    const specialty = await businessSpecialtyService.removeSpecialty(req.params.id);
    res.json({ success: true, data: specialty });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const getMarketplaceAppOptions = async (req, res) => {
  try {
    const options = await businessSpecialtyService.getMarketplaceAppOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listSpecialties,
  createSpecialty,
  updateSpecialty,
  removeSpecialty,
  getMarketplaceAppOptions,
};
