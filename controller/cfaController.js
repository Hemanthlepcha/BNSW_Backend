import CFA from '../models/cfa.model.js';

export const getAllCFAs = async (req, res) => {
  try {
    const cfas = await CFA.findAll();
    res.json(cfas);
  } catch (error) {
    console.error('Error fetching CFAs:', error);
    res.status(500).json({ error: 'Failed to fetch CFAs' });
  }
};

export const getCFAByLicense = async (req, res) => {
  try {
    const { license } = req.params;
    const cfa = await CFA.findByLicense(license);
    
    if (!cfa) {
      return res.status(404).json({ error: 'CFA not found' });
    }
    
    res.json(cfa);
  } catch (error) {
    console.error('Error fetching CFA:', error);
    res.status(500).json({ error: 'Failed to fetch CFA' });
  }
};

export const createCFA = async (req, res) => {
  try {
    const { cfa_license, cfa_name, employees } = req.body;

    if (!cfa_license || !cfa_name) {
      return res.status(400).json({ error: 'CFA license and name are required' });
    }

    const existingCFA = await CFA.findByLicense(cfa_license);
    if (existingCFA) {
      return res.status(409).json({ error: 'CFA with this license already exists' });
    }

    const newCFA = await CFA.create({ cfa_license, cfa_name, employees });
    res.status(201).json(newCFA);
  } catch (error) {
    console.error('Error creating CFA:', error);
    res.status(500).json({ error: 'Failed to create CFA' });
  }
};

export const updateCFA = async (req, res) => {
  try {
    const { license } = req.params;
    const { cfa_name, employees } = req.body;

    if (!cfa_name && employees === undefined) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const updatedCFA = await CFA.update(license, { cfa_name, employees });
    
    if (!updatedCFA) {
      return res.status(404).json({ error: 'CFA not found' });
    }

    res.json(updatedCFA);
  } catch (error) {
    console.error('Error updating CFA:', error);
    res.status(500).json({ error: 'Failed to update CFA' });
  }
};

export const deleteCFA = async (req, res) => {
  try {
    const { license } = req.params;
    const deletedCFA = await CFA.delete(license);
    
    if (!deletedCFA) {
      return res.status(404).json({ error: 'CFA not found' });
    }

    res.json({ message: 'CFA deleted successfully' });
  } catch (error) {
    console.error('Error deleting CFA:', error);
    res.status(500).json({ error: 'Failed to delete CFA' });
  }
};

export const addCFAEmployee = async (req, res) => {
  try {
    const { license } = req.params;
    const { employee_id, name, cid } = req.body;

    if (!employee_id || !name || !cid) {
      return res.status(400).json({ error: 'Employee ID, name, and CID are required' });
    }

    const updatedCFA = await CFA.addEmployee(license, { employee_id, name, cid });
    
    if (!updatedCFA) {
      return res.status(404).json({ error: 'CFA not found' });
    }

    res.json(updatedCFA);
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ error: 'Failed to add employee' });
  }
};

export const updateCFAEmployee = async (req, res) => {
  try {
    const { license, employeeId } = req.params;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const updatedCFA = await CFA.updateEmployee(license, employeeId, updates);
    
    if (!updatedCFA) {
      return res.status(404).json({ error: 'CFA or employee not found' });
    }

    res.json(updatedCFA);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

export const removeCFAEmployee = async (req, res) => {
  try {
    const { license, employeeId } = req.params;
    const updatedCFA = await CFA.removeEmployee(license, employeeId);
    
    if (!updatedCFA) {
      return res.status(404).json({ error: 'CFA or employee not found' });
    }

    res.json(updatedCFA);
  } catch (error) {
    console.error('Error removing employee:', error);
    res.status(500).json({ error: 'Failed to remove employee' });
  }
};
