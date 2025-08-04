import CFARequest from '../models/cfaRequest.model.js';

export const createCFARequest = async (req, res) => {
  try {
    const { bo_license, cfa_license,employee_id } = req.body;
    console.log('Creating CFA request with data:', { bo_license, cfa_license, employee_id });

    // Check if required fields are present
    if (!bo_license || !cfa_license || !employee_id) {
      return res.status(400).json({
        error: 'Business owner license and CFA license are required'
      });
    }

    // Check if business owner already has any pending or approved requests
    const existingRequests = await CFARequest.findByBusinessOwner(bo_license);
    const activeRequest = existingRequests.find(r => ['PENDING', 'APPROVED'].includes(r.status));

    if (activeRequest) {
      return res.status(409).json({
        error: activeRequest.status === 'PENDING' 
          ? 'You already have a pending request with a CFA. Please wait for approval or rejection.'
          : 'You already have an approved CFA. Please contact support if you need to change.'
      });
    }

    // Create the request
    const request = await CFARequest.create({bo_license, cfa_license, employee_id });
    res.status(201).json(request);

  } catch (error) {
    console.error('Error creating CFA request:', error);
    res.status(500).json({ error: 'Failed to create CFA request' });
  }
};

export const getBusinessOwnerRequests = async (req, res) => {
  try {
    const { bo_license } = req.params;
    
    if (!bo_license) {
      console.error('No business license provided in params');
      return res.status(400).json({ 
        success: false,
        error: 'Business owner license is required' 
      });
    }

    console.log('Fetching requests for business owner:', bo_license);
    const requests = await CFARequest.findByBusinessOwner(bo_license);
    console.log('Found requests:', requests);

    res.json({
      success: true,
      requests: requests || []
    });

  } catch (error) {
    console.error('Error getting business owner requests:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get business owner requests',
      details: error.message 
    });
  }
};

export const getCFARequests = async (req, res) => {
  try {
    const { cfa_license } = req.params;
    const requests = await CFARequest.findByCFA(cfa_license);
    console.log('Found CFA requests:', requests);
    res.json(requests);

  } catch (error) {
    console.error('Error getting CFA requests:', error);
    res.status(500).json({ error: 'Failed to get CFA requests' });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (PENDING, APPROVED, or REJECTED) is required' });
    }

    // Get the current request
    const currentRequest = await CFARequest.findById(id);
    if (!currentRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // If trying to approve, check if business owner already has an approved request
    if (status === 'APPROVED') {
      const existingRequests = await CFARequest.findByBusinessOwner(currentRequest.bo_license);
      const hasApproved = existingRequests.some(r => 
        r.id !== id && r.status === 'APPROVED'
      );

      if (hasApproved) {
        return res.status(409).json({
          error: 'Business owner already has an approved CFA'
        });
      }
    }

    const updatedRequest = await CFARequest.updateStatus(id, status);
    res.json(updatedRequest);

  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
};

export const assignEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const updatedRequest = await CFARequest.assignEmployee(id, employee_id);
    res.json(updatedRequest);

  } catch (error) {
    console.error('Error assigning employee:', error);
    res.status(500).json({ error: 'Failed to assign employee' });
  }
};
