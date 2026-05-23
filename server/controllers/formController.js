import * as appStore from '../appStore.js';

export const getFormTemplates = async (req, res) => {
  try {
    res.json(await appStore.listFormTemplates());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createFormTemplate = async (req, res) => {
  try {
    const row = await appStore.insertFormTemplate(req.body);
    res.status(201).json(row);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getCampaigns = async (req, res) => {
  try {
    res.json(await appStore.listCampaigns());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCampaign = async (req, res) => {
  try {
    const row = await appStore.insertCampaign(req.body);
    res.status(201).json(row);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
