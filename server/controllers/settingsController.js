import * as appStore from '../appStore.js';

export const getSettings = async (req, res) => {
  try {
    const settings = await appStore.loadSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await appStore.storeSettings(req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
